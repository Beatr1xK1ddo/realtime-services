import { Socket } from 'socket.io-client';
export declare abstract class NodeService {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;
    constructor(nodeId: number, url: string);
    abstract init(): void;
}
