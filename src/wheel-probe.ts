/**
 * Diagnostic probe: rule out an async-read quirk by trying synchronous,
 * timed reads, and optionally sending the Logitech "native mode" switch.
 *
 * Run:               npm run probe
 * With mode switch:  WHEEL_SWITCH=1 npm run probe
 */

import HID from 'node-hid';

const LOGITECH_VID = 0x046d;

function findWheel(): HID.Device | undefined {
    return HID.devices().find((d) => d.vendorId === LOGITECH_VID);
}

function toHex(buf: number[] | Buffer): string {
    return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
}

function main(): void {
    const dev = findWheel();
    if (!dev || !dev.path) {
        console.error('No Logitech device found.');
        process.exit(1);
    }
    console.log(
        `Device: ${dev.product} PID 0x${(dev.productId ?? 0).toString(16)} path=${dev.path}`,
    );

    const device = new HID.HID(dev.path);

    if (process.env.WHEEL_SWITCH === '1') {
        // Driving Force GT "switch to native mode" sequence (from Linux lg4ff).
        // Two extended commands on report id 0; node-hid takes the first array
        // byte as the report id, so we prepend 0x00.
        // After this the device should re-enumerate with PID 0xc29a.
        const cmds = [
            [0x00, 0xf8, 0x09, 0x03, 0x01, 0x00, 0x00, 0x00], // revert mode on USB reset
            [0x00, 0xf8, 0x81, 0x00, 0x00, 0x00, 0x00, 0x00], // switch to DF-GT native mode
        ];
        for (const cmd of cmds) {
            try {
                console.log(`Sending: ${toHex(cmd)}`);
                device.write(cmd);
                console.log('  write OK');
            } catch (err) {
                console.error('  write failed:', (err as Error).message);
            }
        }
        try {
            device.close();
        } catch {
            /* ignore */
        }
        console.log('Wait ~2s, then re-scan...');
        setTimeout(() => {
            const all = HID.devices().filter((d) => d.vendorId === LOGITECH_VID);
            for (const d of all) {
                console.log(
                    `  now: ${d.product} PID 0x${(d.productId ?? 0).toString(16)} path=${d.path}`,
                );
            }
            process.exit(0);
        }, 2000);
        return;
    }

    console.log('Trying 8 synchronous reads with 1500ms timeout each.');
    console.log('Move the wheel/pedals now.\n');
    for (let i = 0; i < 8; i++) {
        try {
            const data = device.readTimeout(1500);
            if (data && data.length > 0) {
                console.log(`read #${i}: [${data.length}B] ${toHex(data)}`);
            } else {
                console.log(`read #${i}: (timeout, no data)`);
            }
        } catch (err) {
            console.log(`read #${i}: error ${(err as Error).message}`);
        }
    }
    device.close();
    console.log('\nProbe done.');
}

main();
