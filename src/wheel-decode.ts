/**
 * Logitech wheel decoder / calibration helper.
 *
 * Tracks min/max of every byte in the HID report while you perform a guided
 * sequence, so we can reliably identify which bytes are steering, pedals and
 * buttons (and their value ranges) instead of guessing.
 *
 * Run:  npm run decode
 * Then follow the on-screen sequence. Press Ctrl+C (or wait) to see the summary.
 */

import HID from 'node-hid';

const LOGITECH_VID = 0x046d;

function findWheel(): HID.Device | undefined {
    return HID.devices().find((d) => d.vendorId === LOGITECH_VID);
}

function pad(n: number, w: number): string {
    return n.toString().padStart(w, ' ');
}

function main(): void {
    const dev = findWheel();
    if (!dev || !dev.path) {
        console.error('No Logitech device found. Is it powered + connected?');
        process.exit(1);
    }
    console.log(`Device: ${dev.product} PID 0x${(dev.productId ?? 0).toString(16)}\n`);

    const device = new HID.HID(dev.path);

    // Disable the auto-center spring so the wheel can be turned freely.
    // (Logitech FF command, report id 0: f5 00 00 00 00 00 00 — from hid-lg4ff.)
    try {
        device.write([0x00, 0xf5, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        console.log('Sent auto-center OFF (f5). Wheel should now turn freely.\n');
    } catch (err) {
        console.error('Could not send auto-center off:', (err as Error).message);
    }

    let min: number[] | null = null;
    let max: number[] | null = null;
    let prev: number[] | null = null;

    console.log('Guided sequence (take your time, ~5s each):');
    console.log('  1) Steering:  turn FULLY LEFT, then FULLY RIGHT, then center');
    console.log('  2) Gas pedal: release, then press FULLY');
    console.log('  3) Brake:     release, then press FULLY');
    console.log('  4) Buttons:   press each button/paddle once');
    console.log('\nWatching for changes...\n');

    device.on('data', (data: Buffer) => {
        const bytes = Array.from(data);
        if (!min) {
            min = [...bytes];
            max = [...bytes];
            prev = [...bytes];
            return;
        }
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] < min[i]) min[i] = bytes[i];
            if (bytes[i] > (max as number[])[i]) (max as number[])[i] = bytes[i];
        }
        // Report which byte indices changed since last report, so buttons/pedals
        // are easy to spot as you press them one at a time.
        const changed: string[] = [];
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] !== (prev as number[])[i]) {
                changed.push(`b${i}:${(prev as number[])[i]}->${bytes[i]}`);
            }
        }
        prev = bytes;
        if (changed.length > 0) {
            console.log(changed.join('  '));
        }
    });

    device.on('error', (err: Error) => {
        console.error('Device error:', err.message);
        process.exit(1);
    });

    const runMs = parseInt(process.env.WHEEL_READ_MS || '45000', 10);

    const printSummary = () => {
        console.log('\n================ SUMMARY (per-byte min..max) ================');
        if (!min || !max) {
            console.log('No data captured.');
            return;
        }
        for (let i = 0; i < min.length; i++) {
            const range = (max as number[])[i] - min[i];
            const kind = range === 0 ? 'constant' : range <= 4 ? 'button/bitfield?' : 'axis?';
            console.log(
                `  byte[${i}]  min=${pad(min[i], 3)}  max=${pad((max as number[])[i], 3)}  ` +
                    `range=${pad(range, 3)}   ${kind}`,
            );
        }
        console.log('=============================================================');
    };

    setTimeout(() => {
        printSummary();
        device.close();
        process.exit(0);
    }, runMs);

    process.on('SIGINT', () => {
        printSummary();
        device.close();
        process.exit(0);
    });

    console.log(`(running ${runMs / 1000}s, or Ctrl+C when done)\n`);
}

main();
