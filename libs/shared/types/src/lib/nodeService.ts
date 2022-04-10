import { io, Socket } from 'socket.io-client';
import { PinoLogger } from '@socket/shared-utils';
import { IDeviceResponse, IPinoOptions } from '@socket/shared-types';
import { Socket as NetSocket } from 'net';

export type IDevices<T extends Device = Device> = {
    [key: string]: T;
};

export abstract class NodeService<D extends Device = any> {
    protected nodeId: number;
    protected url: string;
    protected socket: Socket;
    protected logger: PinoLogger;
    protected devices?: IDevices<D>;

    constructor(
        nodeId: number,
        url: string,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        this.nodeId = nodeId;
        this.devices = {};
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
            `NodeService created with "nodeId: ${nodeId}" for ${url} state ${this.socket.disconnected}`
        );
    }
}

export abstract class Device {
    protected response?: IDeviceResponse;
    protected ip: string;
    protected port: number;
    protected logger?: PinoLogger;
    protected socket: NetSocket;
    protected timeout?: number;
    protected debounceTrigger = false;

    constructor(ip: string, port: number, timeout?: number) {
        this.ip = ip;
        this.port = port;
        this.socket = new NetSocket();
        this.socket.setEncoding('utf8');
        if (timeout) {
            this.timeout = timeout;
            this.socket.setTimeout(this.timeout);
        }
    }

    abstract command(cmd: string): void;
}
