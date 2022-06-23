import {Socket as NetSocket} from "net";
import {debounce} from "lodash";

import {BasicLogger, IBasicLoggerOptions} from "./basicLogger";

export type IDevices<T extends Device = Device> = {
    [key: string]: T;
};

export type IDeviceOptions = {
    timeout?: number;
    reconnectionAttempts?: number;
    debounceDelay?: number;
    loggerOptions?: Partial<IBasicLoggerOptions>;
};

export class Device {
    protected ip: string;
    protected port: number;
    protected socket: NetSocket;
    protected reconnectionAttempts: number;
    protected reconnectionAttemptsUsed: number;
    protected timeout?: number;

    private logger: BasicLogger;

    protected id: string;
    protected commandResult: string;
    protected responseDebounceDelay?: number;
    protected responseHandler?: (data: string) => void;
    protected online: boolean;

    private keepAliveIntervalId: NodeJS.Timer;
    private alive: boolean;

    constructor(ip: string, port: number, options?: IDeviceOptions) {
        this.ip = ip;
        this.port = port;
        this.socket = new NetSocket();
        this.socket.setEncoding("utf8");
        this.reconnectionAttempts = options?.reconnectionAttempts || 10;
        this.reconnectionAttemptsUsed = 0;
        if (options?.timeout) {
            this.timeout = options.timeout;
            this.socket.setTimeout(this.timeout);
        }
        this.logger = new BasicLogger(
            options?.loggerOptions?.name,
            options?.loggerOptions?.level,
            options?.loggerOptions?.path
        );
        this.id = `${this.ip}:${this.port}`;
        this.commandResult = "";
        this.responseDebounceDelay = options?.debounceDelay;
        this.online = false;
    }

    connect(): void {
        this.log("connecting");
        this.online = false;
        this.socket.connect({host: this.ip, port: this.port}, this.handleConnectionEstablished.bind(this));
        this.socket.on("close", this.handleConnectionClosed.bind(this));
        this.socket.on("error", this.handleConnectionError.bind(this));
        this.socket.on("timeout", this.handleConnectionTimeout.bind(this));
        this.socket.on("data", this.handleCommandResult.bind(this));
        this.keepAliveIntervalId = setInterval(this.keepAliveHandler.bind(this), 3000);
    }

    private keepAliveHandler(): void {
        if (this.alive) {
            this.alive = false;
            this.sendCommand("ping\r\n", false).then(() => (this.alive = true));
        } else {
            this.log("connection lost");
            this.reconnect();
        }
    }

    private reconnect(): void {
        clearInterval(this.keepAliveIntervalId);
        this.log(`reconnecting #${this.reconnectionAttemptsUsed}`);
        this.socket.removeAllListeners();
        this.socket = new NetSocket();
        this.socket.setEncoding("utf8");
        setTimeout(this.connect.bind(this), this.reconnectionAttemptsUsed * 5000 + 5000);
        this.reconnectionAttemptsUsed++;
    }

    protected handleConnectionEstablished() {
        this.log("connected");
        this.online = true;
    }

    protected handleConnectionClosed(error: boolean) {
        this.log(`connection closed`);
        if (error || this.reconnectionAttemptsUsed < this.reconnectionAttempts) {
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
        this.log("connection inactive");
    }

    sendCommand(command: string, logging: boolean = true): Promise<any> {
        logging && this.log(`sending command ${command}`);
        this.commandResult = "";
        this.responseHandler = undefined;
        return new Promise((resolve, reject) => {
            const resultHandler = (data: string) => {
                logging && this.log(`resolving command ${command} with ${data}`);
                resolve(data);
            };
            this.responseHandler = this.responseDebounceDelay
                ? debounce(resultHandler, this.responseDebounceDelay)
                : resultHandler;
            this.socket.write(command, (error) => {
                if (error) {
                    this.log(`sending command end up with error: ${error.message}`, true);
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
