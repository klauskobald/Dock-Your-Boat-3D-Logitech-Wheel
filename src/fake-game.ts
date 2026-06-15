/**
 * Minimal stand-in for the Dock Your Boat game server, for testing the wheel
 * without the real game. Listens on TCP 2612, decodes the null-terminated
 * "{groupId}{json}" frames the client sends, and prints them.
 *
 * Run:  npm run fakegame
 */

import * as net from 'net';

const PORT = parseInt(process.env.GAME_PORT || '2612', 10);

const server = net.createServer((socket) => {
    console.log(`Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    let buffer = '';

    socket.on('data', (chunk) => {
        buffer += chunk.toString();
        // Frames are terminated with a null byte.
        let nul = buffer.indexOf('\0');
        while (nul !== -1) {
            const frame = buffer.substring(0, nul);
            buffer = buffer.substring(nul + 1);
            if (frame.length > 1) {
                const groupId = frame[0];
                const json = frame.substring(1);
                console.log(`[group ${groupId}] ${json}`);
            }
            nul = buffer.indexOf('\0');
        }
    });

    socket.on('close', () => console.log('Client disconnected'));
    socket.on('error', (err) => console.log('Socket error:', err.message));
});

// SO_REUSEADDR avoids "address already in use" on quick restarts (TIME_WAIT).
server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`Fake game listening on port ${PORT}. Waiting for the wheel client...`);
});
