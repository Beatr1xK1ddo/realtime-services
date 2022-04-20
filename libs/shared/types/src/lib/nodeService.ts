import { Socket as NetSocket } from 'net';
import { io, Socket } from 'socket.io-client';
import { debounce, PinoLogger } from '@socket/shared-utils';
import { IPinoOptions } from '@socket/shared-types';

export type NodeServiceOptions = {
    loggerOptions?: Partial<IPinoOptions>;
};

export class NodeService {
    protected name: string;
    protected nodeId: number;
    protected mainServiceUrl: string;
    private socket: Socket;
    private logger: PinoLogger;

    protected constructor(
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        this.name = name.toUpperCase();
        this.nodeId = nodeId;
        this.mainServiceUrl = mainServiceUrl;
        this.socket = io(this.mainServiceUrl, {
            secure: true,
            reconnection: true,
        });
        this.logger = new PinoLogger(
            options?.loggerOptions?.name,
            options?.loggerOptions?.level,
            options?.loggerOptions?.path
        );
        this.socket.on('connect', this.onConnected.bind(this));
        this.socket.on('disconnect', this.onDisconnected.bind(this));
        this.socket.on('error', this.onError.bind(this));
        this.log(
            `created. Parameters: nodeId: ${nodeId}, main service URL: ${mainServiceUrl}`
        );
    }

    protected onConnected(): void {
        this.log(`transport connected`);
    }

    protected onDisconnected(reason: string): void {
        this.log(`transport disconnected ${reason}`);
    }

    protected onError(error: any): void {
        this.log(`error ${error}`, true);
    }

    protected registerHandler(
        event: string,
        handler: (data?: any) => void
    ): void {
        this.socket.on(event, handler);
    }

    protected emit(event: string, data?: any): void {
        this.socket.emit(event, data);
    }

    protected log(message: string, error?: boolean): void {
        const loggingMessage = `${this.name} node service: ${message}`;
        if (error) {
            this.logger.log.error(loggingMessage);
        } else {
            this.logger.log.info(loggingMessage);
        }
    }
}

export type Devices<T extends Device = Device> = {
    [key: string]: T;
};

export class NodeDeviceService<D extends Device = Device> extends NodeService {
    protected devices?: Devices<D>;

    protected constructor(
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        super(name, nodeId, mainServiceUrl, options);
        this.devices = {};
    }
}

type DeviceOptions = {
    timeout?: number;
    reconnectionAttempts?: number;
    debounceDelay?: number;
    loggerOptions?: Partial<IPinoOptions>;
};

export class Device {
    protected ip: string;
    protected port: number;
    protected socket: NetSocket;
    protected reconnectionAttempts: number;
    protected reconnectionAttemptsUsed: number;
    protected timeout?: number;

    private logger: PinoLogger;

    protected id: string;
    protected commandResult: string;
    protected responseDebounceDelay?: number;
    protected responseHandler?: (data: string) => void;

    protected constructor(ip: string, port: number, options?: DeviceOptions) {
        this.ip = ip;
        this.port = port;
        this.socket = new NetSocket();
        this.socket.setEncoding('utf8');
        this.reconnectionAttempts = options?.reconnectionAttempts || 10;
        this.reconnectionAttemptsUsed = 0;
        if (options?.timeout) {
            this.timeout = options.timeout;
            this.socket.setTimeout(this.timeout);
        }
        this.logger = new PinoLogger(
            options?.loggerOptions?.name,
            options?.loggerOptions?.level,
            options?.loggerOptions?.path
        );
        this.id = `${this.ip}:${this.port}`;
        this.commandResult = '';
        this.responseDebounceDelay = options?.debounceDelay;
    }

    protected connect(): void {
        this.socket.connect(
            { host: this.ip, port: this.port },
            this.handleConnectionEstablished.bind(this)
        );
        this.socket.on('close', this.handleConnectionClosed.bind(this));
        this.socket.on('error', this.handleConnectionError.bind(this));
        this.socket.on('timeout', this.handleConnectionTimeout.bind(this));
        this.socket.on('data', this.handleCommandResult.bind(this));
    }

    private reconnect(): void {
        this.socket.removeAllListeners();
        setTimeout(
            this.connect.bind(this),
            this.reconnectionAttemptsUsed * 5000 + 5000
        );
        this.reconnectionAttemptsUsed++;
    }

    protected handleConnectionEstablished() {
        this.log('connected');
    }

    protected handleConnectionClosed(error: boolean) {
        this.log(`connection closed`);
        if (
            error ||
            this.reconnectionAttemptsUsed < this.reconnectionAttempts
        ) {
            this.reconnect();
        } else {
            this.handleDisconnect();
        }
    }

    protected handleDisconnect(): void {
        this.log(`disconnected`);
    }

    protected handleConnectionError(error: Error): void {
        this.log(`error: ${error.message}`, true);
    }

    protected handleConnectionTimeout(): void {
        this.log('connection inactive');
    }

    protected sendCommand(command: string): Promise<any> {
        this.log(`sending command ${command}`);
        this.commandResult = '';
        this.responseHandler = undefined;
        return new Promise((resolve, reject) => {
            const resultHandler = (data: string) => {
                this.log(`resolving command ${command} with ${data}`);
                resolve(data);
            };
            this.responseHandler = this.responseDebounceDelay
                ? debounce(resultHandler, this.responseDebounceDelay)
                : resultHandler;
            this.socket.write(command, (error) => {
                if (error) {
                    this.log(
                        `sending command end up with error: ${error.message}`,
                        true
                    );
                    reject(error);
                }
            });
        });
    }

    protected handleCommandResult(response: string): void {
        // this.log(`command response ${response}`);
        this.commandResult += response;
        this.responseHandler && this.responseHandler(this.commandResult);
    }

    protected log(message: string, error?: boolean): void {
        const loggingMessage = `Device ${this.id}: ${message}`;
        if (error) {
            this.logger.log.error(loggingMessage);
        } else {
            this.logger.log.info(loggingMessage);
        }
    }
}
