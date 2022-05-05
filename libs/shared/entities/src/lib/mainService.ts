import {Namespace, Socket} from "socket.io";

import {IMainServiceModule, IPinoOptions} from "@socket/shared-types";
import {PinoLogger} from "@socket/shared-utils";

export type MainServiceModuleOptions = {
    logger?: Partial<IPinoOptions>;
};

export class MainServiceModule implements IMainServiceModule {
    name: string;
    options?: MainServiceModuleOptions;
    protected socket?: Namespace;
    protected logger: PinoLogger;

    constructor(name: string, options?: MainServiceModuleOptions) {
        const loggerOptions = this.options?.logger;
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
        this.name = name;
        this.options = options;
        this.log("creating");
    }

    init(socket: Namespace): void {
        this.log("initializing");
        this.socket = socket;
        this.socket.on("connection", this.onConnected.bind(this));
        this.socket.on("disconnect", this.onDisconnected.bind(this));
        this.socket.on("error", this.onError.bind(this));
    }

    protected onConnected(socket: Socket): void {
        this.log("transport connected");
    }

    protected onDisconnected(reason: string): void {
        this.log(`transport disconnected ${reason}`);
    }

    protected onError(error: any): void {
        this.log(`error ${error}`, true);
    }

    protected registerHandler(event: string, handler: (data?: any) => void): void {
        if (this.validateInit()) {
            this.log(`registering handler for ${event}`);
            this.socket!.on(event, handler);
        }
    }

    protected emit(event: string, data?: any): void {
        if (this.validateInit()) {
            this.socket!.emit(event, data);
        }
    }

    protected log(message: string, error?: boolean): void {
        const loggingMessage = `Service ${this.name}: ${message}`;
        if (error) {
            this.logger.log.error(loggingMessage);
        } else {
            this.logger.log.info(loggingMessage);
        }
    }

    private validateInit(): boolean {
        if (this.socket) {
            return true;
        } else {
            this.log("validation failure, you should call init before any further interactions");
            return false;
        }
    }
}
