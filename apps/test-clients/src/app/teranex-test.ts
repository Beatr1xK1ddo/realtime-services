import { Manager } from 'socket.io-client';
import { IClientCmdRequestEvent } from '@socket/shared-types';

const nodeId = 356;
const ip = '192.168.99.22';
const port = 9800;

const commands = ['VIDEO OUTPUT:\nVideo mode: 720p59.94\n\n'];
/*
const commands = [
    "VIDEO INPUT:\nAuto detection enabled: true\nAuto detection prefer PsF: false\nVideo source: SDI1\nAudio source: AES\nSignal present: false\nTimecode present: None\nClosed captioning present: None\nWide SD aspect: false\nHDMI 3D Full: false\nOptical module present: false\nVideo pixel format: YCbCr422\nPCIe mode: None\n",
    "VIDEO OUTPUT:\nVideo mode: 1080p59.94\nAspect ratio: Anamorphic\nVideo demux mode: SingleLink\nOutput sdi mode: LevelA\nQuad sdi output: QuadHDSplit\nQuad ancillary replication: true\nVideo pixel format: YCbCr422\nAnalog output: Component\nOutput option: Input\nTransition setting: 0\nStill frame present: false\nStill load complete: true\nStill store complete: true\nStill preview complete: true\nHDMI output: YCbCr422\n"
];
*/

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
        // commands: ['TERANEX DEVICE\n\n'],
        commands,
    } as IClientCmdRequestEvent);
}
