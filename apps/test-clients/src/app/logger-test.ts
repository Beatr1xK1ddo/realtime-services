import { io, Manager } from 'socket.io-client';

export function loggerTestRun(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    // const manager = new Manager(url);
    // const socket = manager.socket('/logger');
    const socket = io(`${url}/logger`);

    socket.on('connect', () => {
        console.log('Client connected to LoggerModule');
        socket.emit('subscribe', { nodeId: 2975, logType: 'appLog' });
    });

    socket.on('data', (data) => {
        console.log(`Logger data ${JSON.stringify(data)}`);
    });
    socket.on('error', (error) => {
        console.log(`Logger error ${JSON.stringify(error)}`);
    });
}
