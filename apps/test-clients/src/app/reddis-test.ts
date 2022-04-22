import { Manager } from 'socket.io-client';

export function reddisTestClient(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    const manager = new Manager(url);
    const socket = manager.socket('/reddis');

    socket.on('connect', () => {
        console.log('Client connected to Reddis');
        socket.emit('subscribe', { nodeId: 2753, type: 'timing', id: '836' });
    });

    socket.on('response', (data) => {
        console.log(`Reddis data ${JSON.stringify(data)}`);
    });

    socket.on('error', (error) => {
        console.log(`Reddis error ${JSON.stringify(error)}`);
    });
}
