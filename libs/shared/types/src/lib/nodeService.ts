import { io, Socket } from 'socket.io-client';
import { PinoLogger } from '@socket/shared-utils';
import { IPinoOptions } from '@socket/shared-types';

export abstract class NodeService {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;
    protected logger: PinoLogger;

    constructor(
        nodeId: number,
        url: string,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        this.nodeId = nodeId;
        this.url = url;
        this.socket = io(this.url, {
            secure: true,
            reconnection: true,
        });
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
        this.socket.on('disconnect', (reason) =>
            this.logger.log.info(`NodeService transport disconnected ${reason}`)
        );
        this.logger.log.info(
            `NodeService created on ${nodeId} for ${url} state ${this.socket.disconnected}`
        );
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}
