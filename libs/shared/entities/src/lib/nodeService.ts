import {io, Socket} from "socket.io-client";

import {IPinoOptions} from "@socket/shared-types";
import {PinoLogger} from "@socket/shared-utils";
import {Device, Devices} from "./device";

export type NodeServiceOptions = {
    logger?: Partial<IPinoOptions>;
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
            // secure: true,
            // reconnection: true,
        });
        this.logger = new PinoLogger(
            options?.logger?.name,
            options?.logger?.level,
            options?.logger?.path
        );
        this.socket.on("connect", this.onConnected.bind(this));
        this.socket.on("disconnect", this.onDisconnected.bind(this));
        this.socket.on("error", this.onError.bind(this));
        this.log(`created. Parameters: nodeId: ${nodeId}, main service URL: ${mainServiceUrl}`);
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

    protected registerHandler(event: string, handler: (data?: any) => void): void {
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

export abstract class NodeDeviceService<D extends Device = Device> extends NodeService {
    protected devices?: Devices<D>;

    constructor(
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        super(name, nodeId, mainServiceUrl, options);
        this.devices = {};
    }
}
