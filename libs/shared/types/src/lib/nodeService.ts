import { io, Socket } from 'socket.io-client';
import { PinoLogger } from '@socket/shared-utils';
export abstract class NodeService {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;
    protected logger: PinoLogger;

    constructor(nodeId: number, url: string) {
        this.nodeId = nodeId;
        this.url = url;
        this.socket = io(this.url, {
            secure: true,
            reconnection: true,
        });
        this.logger = new PinoLogger();
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}
