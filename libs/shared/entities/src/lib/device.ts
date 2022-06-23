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
    onOnlineStatusChanged?: (online: boolean) => void;
    loggerOptions?: Partial<IBasicLoggerOptions>;
};

export class Device {
    protected ip: string;
    protected port: number;
    protected socket: NetSocket;
    protected reconnectionAttempts: number;
    protected reconnectionAttemptsUsed: number;
    protected timeout?: number;

    protected id: string;
    protected onOnlineStatusChangedHandler: (online: boolean) => void;
    protected commandResult: string;
    protected responseDebounceDelay?: number;
    protected responseHandler?: {
        resolve: (data: string) => void;
        reject: (error?: Error) => void;
    };
    protected online: boolean;

    private logger: BasicLogger;
    private keepAliveIntervalId: NodeJS.Timer;

    constructor(ip: string, port: number, options?: IDeviceOptions) {
        this.ip = ip;
        this.port = port;
        this.reconnectionAttempts = options?.reconnectionAttempts || 10;
        this.reconnectionAttemptsUsed = 0;
        if (options?.timeout) {
            this.timeout = options.timeout;
        }
        this.logger = new BasicLogger(
            options?.loggerOptions?.name,
            options?.loggerOptions?.level,
            options?.loggerOptions?.path
        );
        this.id = `${this.ip}:${this.port}`;
        if (options?.onOnlineStatusChanged) {
            this.onOnlineStatusChangedHandler = options.onOnlineStatusChanged;
        }
        this.commandResult = "";
        this.responseDebounceDelay = options?.debounceDelay;
        this.online = true;
        this.keepAliveIntervalId = setInterval(this.keepAliveHandler.bind(this), 2500);
    }

    private keepAliveHandler(): void {
        const socket = new NetSocket();
        socket.setEncoding("utf8");
        socket.setTimeout(1000);
        socket.connect({host: this.ip, port: this.port});
        socket.on("timeout", () => {
            const online = !socket.connecting;
            if (online && !this.online) {
                this.log("connection up");
                this.reconnect();
            }
            if (this.online && !online) {
                this.log("connection lost", true);
                this.cleanup();
            }
            this.online = online;
            socket.destroy();
        });
    }

    connect(): Device {
        this.log("connecting");
        this.socket = new NetSocket();
        this.socket.setEncoding("utf8");
        this.socket.setKeepAlive(true);
        this.socket.connect({host: this.ip, port: this.port}, this.handleConnectionEstablished.bind(this));
        this.socket.on("close", this.handleConnectionClosed.bind(this));
        this.socket.on("error", this.handleConnectionError.bind(this));
        this.socket.on("timeout", this.handleConnectionTimeout.bind(this));
        this.socket.on("data", this.handleCommandResult.bind(this));
        if (this.timeout) {
            this.socket.setTimeout(this.timeout);
        }
        return this;
    }

    disconnect(): void {
        this.cleanup();
        clearInterval(this.keepAliveIntervalId);
    }

    private cleanup() {
        this.log("performing cleanup");
        this.responseHandler && this.responseHandler.reject();
        this.onOnlineStatusChangedHandler && this.onOnlineStatusChangedHandler(false);
        this.online = false;
        this.socket.removeAllListeners();
        this.socket.destroy();
        this.socket = null;
    }

    private reconnect(): void {
        this.log(`reconnecting #${this.reconnectionAttemptsUsed}`);
        setTimeout(this.connect.bind(this), this.reconnectionAttemptsUsed * 5000 + 5000);
        this.reconnectionAttemptsUsed++;
    }

    protected handleConnectionEstablished() {
        this.log("connected");
        this.onOnlineStatusChangedHandler && this.onOnlineStatusChangedHandler(true);
    }

    protected handleConnectionClosed(error: boolean) {
        this.log(`connection closed`);
        if (error || this.reconnectionAttemptsUsed < this.reconnectionAttempts) {
            this.cleanup();
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
        if (this.online) {
            this.commandResult = "";
            this.responseHandler = undefined;
            return new Promise((resolve, reject) => {
                const resultHandler = (data: string) => {
                    logging && this.log(`resolving command ${command} with ${data}`);
                    resolve(data);
                };
                this.responseHandler = {
                    resolve: this.responseDebounceDelay
                        ? debounce(resultHandler, this.responseDebounceDelay)
                        : resultHandler,
                    reject,
                };
                this.socket.write(command, (error) => {
                    if (error) {
                        this.log(`sending command end up with error: ${error.message}`, true);
                        reject(error);
                    }
                });
            });
        } else {
            return Promise.reject(new Error("offline"));
        }
    }

    protected handleCommandResult(response: string): void {
        // this.log(`command response ${response}`);
        this.commandResult += response;
        this.responseHandler && this.responseHandler.resolve(this.commandResult);
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
