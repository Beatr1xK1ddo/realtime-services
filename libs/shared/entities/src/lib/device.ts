import {Socket as NetSocket} from "net";

import {commonUtils} from "@socket/shared-utils";

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
    protected pingIntervalId: NodeJS.Timer

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
    };

    connect(): void {
        this.socket.connect({host: this.ip, port: this.port}, this.handleConnectionEstablished.bind(this));
        this.socket.on("close", this.handleConnectionClosed.bind(this));
        this.socket.on("error", this.handleConnectionError.bind(this));
        this.socket.on("timeout", this.handleConnectionTimeout.bind(this));
        this.socket.on("data", this.handleCommandResult.bind(this));
        this.initDevicePing();
    }

    private initDevicePing(): void {
        const pingCommand = () => this.sendCommand("ping\r\n").catch(() => this.log("can't ping device"));
        this.pingIntervalId = setInterval(pingCommand, 5000);
    };

    private reconnect(): void {
        this.log(`reconnecting #${this.reconnectionAttemptsUsed}`);
        this.socket.removeAllListeners();
        this.socket = new NetSocket();
        this.socket.setEncoding("utf8");
        clearInterval(this.pingIntervalId);
        setTimeout(this.connect.bind(this), this.reconnectionAttemptsUsed * 5000 + 5000);
        this.reconnectionAttemptsUsed++;
    };

    protected handleConnectionEstablished() {
        this.log("connected");
    };

    protected handleConnectionClosed(error: boolean) {
        this.log(`connection closed`);
        if (error || this.reconnectionAttemptsUsed < this.reconnectionAttempts) {
            this.reconnect();
        } else {
            this.handleDisconnect();
        }
    };

    protected handleDisconnect(): void {
        this.log(`disconnected`);
    };

    protected handleConnectionError(error: Error): void {
        this.log(`error: ${error.message}`, true);
    };

    protected handleConnectionTimeout(): void {
        this.log("connection inactive");
    };

    sendCommand(command: string): Promise<any> {
        this.log(`sending command ${command}`);
        this.commandResult = "";
        this.responseHandler = undefined;
        return new Promise((resolve, reject) => {
            const resultHandler = (data: string) => {
                this.log(`resolving command ${command} with ${data}`);
                resolve(data);
            };
            this.responseHandler = this.responseDebounceDelay
                ? commonUtils.debounce(resultHandler, this.responseDebounceDelay)
                : resultHandler;
            this.socket.write(command, (error) => {
                if (error) {
                    this.log(`sending command end up with error: ${error.message}`, true);
                    reject(error);
                }
            });
        });
    };

    protected handleCommandResult(response: string): void {
        // this.log(`command response ${response}`);
        this.commandResult += response;
        this.responseHandler && this.responseHandler(this.commandResult);
    };

    protected log(message: string, error?: boolean): void {
        const loggingMessage = `Device ${this.id}: ${message}`;
        if (error) {
            this.logger.log.error(loggingMessage);
        } else {
            this.logger.log.info(loggingMessage);
        }
    };
}
