import { Manager } from 'socket.io-client';
import { IClientCmdRequestEvent } from '@socket/shared-types';

const nodeId = 356;
const ip = '127.0.0.1';
const port = 1345;

export function teranexTestRun() {
    const manager = new Manager('http://qa.nextologies.com:1987');
    // const manager = new Manager('http://localhost:1987');
    const socket = manager.socket('/teranex');

    socket.on('connect', () => {
        console.log('client subscribed...');
        socket.emit('subscribe', { nodeId, ip, port });
    });
    socket.on('result', (data) => {
        console.log('testing log from "result"');
        console.log(data);
    });

    socket.emit('commands', {
        nodeId,
        ip,
        port,
        commands: ['TERANEX DEVICE\n\n'],
    } as IClientCmdRequestEvent);
}
