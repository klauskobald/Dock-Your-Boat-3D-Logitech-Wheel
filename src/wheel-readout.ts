/**
 * Logitech wheel readout - proof of concept
 *
 * Step 1: find the Logitech wheel on the USB/HID bus and dump its raw HID
 * input reports so we can see which bytes change when steering, pressing
 * pedals or buttons. Cross-platform (macOS / Windows / Linux) via node-hid.
 *
 * Run:  npm run wheel
 */

import HID from 'node-hid';

const LOGITECH_VID = 0x046d;

function listLogitechDevices(): HID.Device[] {
    const all = HID.devices();
    return all.filter((d) => d.vendorId === LOGITECH_VID);
}

function toHex(buf: Buffer): string {
    return Array.from(buf)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
}

function main(): void {
    console.log('Scanning HID bus for Logitech devices (VID 0x046d)...\n');

    const logitech = listLogitechDevices();

    if (logitech.length === 0) {
        console.error('No Logitech HID device found.');
        console.error('All HID devices currently visible:');
        for (const d of HID.devices()) {
            console.error(
                `  VID 0x${(d.vendorId ?? 0).toString(16).padStart(4, '0')} ` +
                    `PID 0x${(d.productId ?? 0).toString(16).padStart(4, '0')}  ` +
                    `${d.product ?? '(no name)'}  ${d.path ?? ''}`,
            );
        }
        process.exit(1);
    }

    for (const d of logitech) {
        console.log(
            `Found: ${d.product ?? '(no name)'}  ` +
                `PID 0x${(d.productId ?? 0).toString(16).padStart(4, '0')}  ` +
                `usagePage 0x${(d.usagePage ?? 0).toString(16)} usage 0x${(d.usage ?? 0).toString(16)}  ` +
                `path=${d.path}`,
        );
    }
    console.log();

    // Pick the first Logitech device. (Wheels usually expose a single
    // joystick/gamepad interface; if there are several we take the first.)
    const target = logitech[0];
    if (!target.path) {
        console.error('Device has no path, cannot open.');
        process.exit(1);
    }

    console.log(`Opening ${target.product} at ${target.path} ...`);
    let device: HID.HID;
    try {
        device = new HID.HID(target.path);
    } catch (err) {
        console.error('Failed to open device:', (err as Error).message);
        console.error('On macOS this can happen if another app grabbed it, or due to permissions.');
        process.exit(1);
    }

    console.log('Opened. Move the wheel, press pedals and buttons.\n');
    console.log('Showing raw input reports (only when bytes change):\n');

    let last = '';
    let reportCount = 0;
    device.on('data', (data: Buffer) => {
        reportCount++;
        const hex = toHex(data);
        if (hex !== last) {
            last = hex;
            console.log(`#${reportCount} [${data.length}B] ${hex}`);
        }
    });

    // Heartbeat so we can tell whether ANY reports are arriving.
    const heartbeat = setInterval(() => {
        console.log(`...alive, reports received so far: ${reportCount}`);
    }, 2000);

    device.on('error', (err: Error) => {
        console.error('Device error:', err.message);
        process.exit(1);
    });

    const runMs = parseInt(process.env.WHEEL_READ_MS || '20000', 10);
    console.log(`(reading for ${runMs / 1000}s, or Ctrl+C to stop)\n`);
    setTimeout(() => {
        clearInterval(heartbeat);
        console.log(`\nDone reading. Total reports: ${reportCount}`);
        device.close();
        process.exit(0);
    }, runMs);

    process.on('SIGINT', () => {
        clearInterval(heartbeat);
        console.log('\nStopping...');
        device.close();
        process.exit(0);
    });
}

main();
