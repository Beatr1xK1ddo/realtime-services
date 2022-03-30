import {io, Socket} from 'socket.io-client';

export abstract class NodeService {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;

    constructor(nodeId: number, url: string) {
        this.nodeId = nodeId;
        this.url = url;
        this.socket = io(this.url);
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}
