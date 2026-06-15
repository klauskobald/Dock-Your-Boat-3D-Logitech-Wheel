/**
 * Logitech wheel -> Dock Your Boat rudder + throttle.
 *
 * Steering -> rudder. Steering is a 14-bit value split over two report bytes:
 *   value = byte[5] * 256 + byte[4]   (range 0..16383, center ~8192)
 * which is normalised to the rudder range -1.0 (left) .. +1.0 (right).
 *
 * Gearshift -> throttle. byte[2] holds the shifter state:
 *   0x02 = shift up (increase), 0x01 = shift down (decrease), 0x00 = released.
 * A tap steps the throttle by TapValue; holding past HoldActivateMs then steps
 * by HoldValue at HoldFps. Throttle ranges -1.0 .. +1.0 (BoatThrottle0).
 *
 * Cross-platform (macOS / Windows / Linux) via node-hid.
 *
 * Run:  npm run drive
 * Env:  GAME_HOST, GAME_PORT, WHEEL_CENTER, WHEEL_INVERT=1, WHEEL_DEADZONE
 */

import HID from 'node-hid';
import { DYBClient } from './DYBClient';

const LOGITECH_VID = 0x046d;

const GAME_HOST = process.env.GAME_HOST || 'localhost';
const GAME_PORT = parseInt(process.env.GAME_PORT || '2612', 10);

// Steering calibration. 14-bit axis, center ~ midpoint. Override if needed.
const STEER_CENTER = parseInt(process.env.WHEEL_CENTER || '8192', 10);
const STEER_HALF_RANGE = parseInt(process.env.WHEEL_HALF_RANGE || '8192', 10);
const DEADZONE = parseFloat(process.env.WHEEL_DEADZONE || '0.02');
const INVERT = process.env.WHEEL_INVERT === '1';

// Only send when a value changed meaningfully, to avoid flooding the game.
const SEND_THRESHOLD = 0.01;

// Gearshift -> throttle. byte[2] bits: 0x02 = increase, 0x01 = decrease.
const GEAR_INC_BIT = 0x02;
const GEAR_DEC_BIT = 0x01;
// Reset button: byte[0] bit 0x10 (rest 0x08 -> pressed 0x18) zeroes throttle.
const THROTTLE_RESET_BIT = 0x10;
const TAP_VALUE = 0.05; // step per tap (press)
const HOLD_VALUE = 0.05; // step per hold tick
const HOLD_ACTIVATE_MS = 200; // hold longer than this to start repeating
const HOLD_FPS = 10; // hold repeats per second
const RESET_STEP = 0.2

// One fixed loop drives hold-repeats and caps sends at HOLD_FPS (10/sec).
const SEND_INTERVAL_MS = 1000 / HOLD_FPS;

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

// Keep throttle on a clean 0.01 grid to avoid float drift across many steps.
function stepThrottle(value: number, delta: number): number {
    return clamp(Math.round((value + delta) * 100) / 100, -1, 1);
}

function main(): void {
    const dev = HID.devices().find((d) => d.vendorId === LOGITECH_VID);
    if (!dev || !dev.path) {
        console.error('No Logitech wheel found. Is it powered + connected?');
        process.exit(1);
    }
    console.log(`Wheel: ${dev.product} PID 0x${(dev.productId ?? 0).toString(16)}`);

    const device = new HID.HID(dev.path);

    // Disable the auto-center spring so the wheel turns freely (f5 command).
    try {
        device.write([0x00, 0xf5, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    } catch (err) {
        console.error('Could not disable auto-center:', (err as Error).message);
    }

    const client = new DYBClient({ host: GAME_HOST, port: GAME_PORT, autoReconnect: true });
    // Without an 'error' listener, EventEmitter throws and crashes the process
    // when the game isn't running. Keep reading the wheel regardless.
    client.on('error', () => {
        /* connection errors are handled via auto-reconnect; ignore here */
    });
    client.connect();

    let latestRudder = 0;
    let latestRaw = 0;
    let lastSentRudder = NaN;

    // Throttle controlled by the gearshift.
    let throttle = 0;
    let lastSentThrottle = NaN;

    // Bow thruster (momentary) from the D-pad: left = -1, right = +1.
    let latestBow = 0;
    let lastSentBow = NaN;
    let prevInc = false;
    let prevDec = false;
    let prevReset = false;
    let resetting = false; // ramping throttle to 0 after a reset tap
    let incPressStart = 0; // ms timestamp while held, 0 when released
    let decPressStart = 0;

    device.on('data', (data: Buffer) => {
        if (data.length < 6) return;

        // 14-bit steering: low byte = b4, high byte = b5.
        const raw = data[5] * 256 + data[4];

        let rudder = (raw - STEER_CENTER) / STEER_HALF_RANGE;
        if (INVERT) rudder = -rudder;
        rudder = clamp(rudder, -1, 1);

        // Apply a small center deadzone.
        if (Math.abs(rudder) < DEADZONE) rudder = 0;

        latestRudder = rudder;
        latestRaw = raw;

        // Gearshift edges -> tap steps the throttle once on press.
        const gear = data[2];
        const inc = (gear & GEAR_INC_BIT) !== 0;
        const dec = (gear & GEAR_DEC_BIT) !== 0;
        const now = Date.now();
        if (inc && !prevInc) {
            throttle = stepThrottle(throttle, TAP_VALUE);
            incPressStart = now;
            resetting = false; // touching the throttle cancels a reset ramp
        } else if (!inc && prevInc) {
            incPressStart = 0;
        }
        if (dec && !prevDec) {
            throttle = stepThrottle(throttle, -TAP_VALUE);
            decPressStart = now;
            resetting = false; // touching the throttle cancels a reset ramp
        } else if (!dec && prevDec) {
            decPressStart = 0;
        }
        prevInc = inc;
        prevDec = dec;

        // Reset tap -> start ramping throttle to 0 (continues after release).
        const reset = (data[0] & THROTTLE_RESET_BIT) !== 0;
        if (reset && !prevReset) {
            resetting = true;
        }
        prevReset = reset;

        // D-pad low nibble: 6 = left, 2 = right, 8 = centered -> bow thruster.
        const hat = data[0] & 0x0f;
        latestBow = hat === 6 ? -1 : hat === 2 ? 1 : 0;
    });

    // Fixed-rate loop (max 10/sec): handle gearshift hold-repeat, then send.
    const sendTimer = setInterval(() => {
        const now = Date.now();

        // Hold longer than HoldActivateMs -> repeat HoldValue at HoldFps.
        if (incPressStart && now - incPressStart >= HOLD_ACTIVATE_MS) {
            throttle = stepThrottle(throttle, HOLD_VALUE);
        }
        if (decPressStart && now - decPressStart >= HOLD_ACTIVATE_MS) {
            throttle = stepThrottle(throttle, -HOLD_VALUE);
        }

        // Reset ramp -> step throttle toward 0 by RESET_STEP per tick.
        if (resetting) {
            throttle =
                throttle > 0
                    ? Math.max(0, stepThrottle(throttle, -RESET_STEP))
                    : Math.min(0, stepThrottle(throttle, RESET_STEP));
            if (throttle === 0) resetting = false;
        }

        if (Number.isNaN(lastSentRudder) || Math.abs(latestRudder - lastSentRudder) >= SEND_THRESHOLD) {
            lastSentRudder = latestRudder;
            if (client.isConnected()) {
                client.sendRudder(latestRudder);
            }
            const pct = (latestRudder * 100).toFixed(0);
            const side = latestRudder > 0.02 ? 'RIGHT' : latestRudder < -0.02 ? 'LEFT ' : 'center';
            console.log(`steer raw=${latestRaw.toString().padStart(5)}  rudder=${pct.padStart(4)}%  ${side}`);
        }

        if (Number.isNaN(lastSentThrottle) || Math.abs(throttle - lastSentThrottle) >= SEND_THRESHOLD) {
            lastSentThrottle = throttle;
            if (client.isConnected()) {
                // Both engines get the same value (2-engine boats).
                client.sendThrottle(throttle, 0);
                client.sendThrottle(throttle, 1);
            }
            console.log(`throttle=${(throttle * 100).toFixed(0).padStart(4)}% (engines 0+1)`);
        }

        if (Number.isNaN(lastSentBow) || latestBow !== lastSentBow) {
            lastSentBow = latestBow;
            if (client.isConnected()) {
                client.sendBowThruster(latestBow);
            }
            console.log(`bow thruster=${latestBow}`);
        }
    }, SEND_INTERVAL_MS);

    device.on('error', (err: Error) => {
        console.error('\nWheel error:', err.message);
        process.exit(1);
    });

    const shutdown = () => {
        console.log('\nShutting down...');
        clearInterval(sendTimer);
        device.close();
        client.disconnect();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log('Turn the wheel (rudder). Use the gearshift up/down to change throttle.');
    console.log('Ctrl+C to stop.');
    if (!INVERT) {
        console.log('If left/right is reversed, restart with WHEEL_INVERT=1 npm run drive\n');
    }
}

main();
