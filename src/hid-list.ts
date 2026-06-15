import HID from 'node-hid';

for (const d of HID.devices()) {
    console.log(
        `VID 0x${(d.vendorId ?? 0).toString(16).padStart(4, '0')} ` +
            `PID 0x${(d.productId ?? 0).toString(16).padStart(4, '0')} ` +
            `usagePage 0x${(d.usagePage ?? 0).toString(16)} usage 0x${(d.usage ?? 0).toString(16)} ` +
            `if=${d.interface} | ${d.product ?? ''} | ${d.path}`,
    );
}
