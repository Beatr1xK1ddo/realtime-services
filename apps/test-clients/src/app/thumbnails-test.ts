import { Manager } from 'socket.io-client';

export function thumbnailTestClient(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    const manager = new Manager(url);
    const socket = manager.socket('/thumb');

    socket.on('connect', () => {
        console.log('Client connected to Thumb');
        socket.emit('subscribe', { channel: 'test' });
    });

    socket.on('response', (data) => {
        console.log(`Thumb data`, data);
    });

    socket.on('error', (error) => {
        console.log(`Thumb error ${JSON.stringify(error)}`);
    });
}
