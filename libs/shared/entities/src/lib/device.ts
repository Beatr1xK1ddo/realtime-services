import {Socket as NetSocket} from "net";

import {IPinoOptions} from "@socket/shared-types";
import {debounce, PinoLogger} from "@socket/shared-utils";

export type Devices<T extends Device = Device> = {
    [key: string]: T;
};

export type DeviceOptions = {
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
    protected deviceResponse?: {
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    };

    private logger: PinoLogger;

    protected id: string;
    protected commandResult: string;
    protected responseDebounceDelay?: number;
    protected responseHandler?: (data: string) => void;

    constructor(ip: string, port: number, options?: DeviceOptions) {
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
        this.logger = new PinoLogger(
            options?.loggerOptions?.name,
            options?.loggerOptions?.level,
            options?.loggerOptions?.path
        );
        this.id = `${this.ip}:${this.port}`;
        this.commandResult = "";
        this.responseDebounceDelay = options?.debounceDelay;
    }

    connect(): Promise<any> {
        this.log("connect is running");
        return new Promise((resolve, reject) => {
            this.deviceResponse = {resolve, reject};
            this.socket.connect(
                {host: this.ip, port: this.port},
                this.handleConnectionEstablished.bind(this)
            );
            this.socket.on("close", this.handleConnectionClosed.bind(this));
            this.socket.on("error", this.handleConnectionError.bind(this));
            this.socket.on("timeout", this.handleConnectionTimeout.bind(this));
            this.socket.on("data", this.handleCommandResult.bind(this));
        });
    }

    private reconnect(): void {
        this.log("reconnect is running");
        // this.socket.destroy();
        setTimeout(this.connect.bind(this), this.reconnectionAttemptsUsed * 5000 + 5000);
        this.reconnectionAttemptsUsed++;
    }

    protected handleConnectionEstablished() {
        this.log("connected");
        this.deviceResponse?.resolve(true);
    }

    protected handleConnectionClosed(error: boolean) {
        this.log(`connection closed`);
        // if (error || this.reconnectionAttemptsUsed < this.reconnectionAttempts) {
        //     this.reconnect();
        // } else {
        //     this.handleDisconnect();
        // }
    }

    protected handleDisconnect(): void {
        this.log(`disconnected`);
    }

    protected handleConnectionError(error: Error): void {
        this.log(`error: ${error.message}`, true);
        this.deviceResponse?.reject(error);
        // this.socket.destroy();
    }

    protected handleConnectionTimeout(): void {
        this.log("connection inactive");
        this.deviceResponse?.reject(false);
        // this.socket.destroy();
    }

    sendCommand(command: string): Promise<any> {
        this.log(`sending command ${command}`);
        this.commandResult = "";
        this.responseHandler = undefined;
        return new Promise((resolve, reject) => {
            this.deviceResponse = {resolve, reject};
            const resultHandler = (data: string) => {
                this.log(`resolving command ${command} with ${data}`);
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

    get check() {
        return this.socket?.destroyed;
    }
}
