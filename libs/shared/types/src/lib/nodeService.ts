import { io, Socket } from 'socket.io-client';

export abstract class NodeService {
    protected socket: Socket;
    protected url: string;

    constructor(url: string) {
        this.url = url;
        this.socket = io(this.url);
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}
