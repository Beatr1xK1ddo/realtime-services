import { io, Socket } from 'socket.io-client';
import { PinoLogger } from '@socket/shared-utils';
export abstract class NodeService {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;
    protected logger: PinoLogger;

    constructor(nodeId: number, url: string) {
        this.logger = new PinoLogger();
        this.nodeId = nodeId;
        this.url = url;
        this.socket = io(this.url, {
            secure: true,
            reconnection: true,
        });
        this.socket.on(
            'disconnect',
            (reason) => this.logger.log.info(`NodeService transport disconnected ${reason}`)
        );
        this.logger.log.info(`NodeService created on ${nodeId} for ${url} state ${this.socket.disconnected}`);
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}
