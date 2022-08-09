import {Namespace, Socket} from "socket.io";

import {IMainServiceModule, StringId} from "@socket/shared-types";

import {BasicLogger, IBasicLoggerOptions} from "./basicLogger";

export type MainServiceModuleOptions = {
    logger?: Partial<IBasicLoggerOptions>;
};

export class MainServiceModule implements IMainServiceModule {
    namespace: string;
    name: string;
    options?: MainServiceModuleOptions;
    protected socket?: Namespace;
    protected logger: BasicLogger;

    constructor(name: string, options?: MainServiceModuleOptions) {
        const loggerOptions = this.options?.logger;
        this.logger = new BasicLogger(loggerOptions?.name, loggerOptions?.level, loggerOptions?.path);
        this.namespace = name;
        this.name = name.toUpperCase();
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

    protected getClientById(clientId: StringId): Socket {
        return this.socket.sockets.get(clientId);
    }

    protected log(message: string, error?: boolean): void {
        const loggingMessage = `${this.name} service: ${message}`;
        if (error) {
            this.logger.log.error(loggingMessage);
        } else {
            this.logger.log.info(loggingMessage);
        }
    }

    protected debug(message: string): void {
        const debugMessage = `${this.name} service: ${message}`;
        this.logger.log.debug(debugMessage);
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
