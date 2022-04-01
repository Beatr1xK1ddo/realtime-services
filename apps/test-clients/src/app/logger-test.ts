import { Manager } from 'socket.io-client';

export function loggerTestRun(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    const manager = new Manager(url);
    const socket = manager.socket('/logger');

    socket.on('connect', () => {
        console.log('Client connected to LoggerModule');
        socket.emit('subscribe', { nodeId: 2975, logType: 'appLog' });
    });

    socket.on('data', (data) => {
        console.log(`Logger data ${data}`);
    });
    socket.on('error', (error) => {
        console.log(`Logger error ${error}`);
    });
}
