import {createServer} from "https";
import {Namespace, Server} from "socket.io";
import {readFileSync} from "fs";

import type {IMainServiceModule, IPinoOptions, SSL} from "@socket/shared-types";

import {PinoLogger} from "@socket/shared-utils";

type MainServiceServerOptions = {
    ssl: SSL;
    logger?: Partial<IPinoOptions>;
};

export class MainServiceServer {
    static namespaces: Map<string, Namespace> = new Map();
    private https;
    private io: Server;
    private logger: PinoLogger;

    constructor(port: number, options: MainServiceServerOptions) {
        this.https = createServer({
            key: readFileSync(options.ssl.key),
            cert: readFileSync(options.ssl.cert),
        }).listen(port);
        //todo: handle cors more precisely
        this.io = new Server(this.https, {cors: {origin: "*"}});
        this.logger = new PinoLogger(options.logger?.name, options.logger?.level, options.logger?.path);
    }

    registerModule(module: IMainServiceModule) {
        this.logger.log.info(`Registering module ${module.name}`);
        if (MainServiceServer.namespaces.has(module.name)) {
            this.logger.log.error(`Module with namespace: ${module.name} already exists`);
            throw TypeError(`Module with namespace: ${module.name} already exists`);
        }
        const ioNamespace = this.io.of(`/${module.name}`);
        MainServiceServer.namespaces.set(module.name, ioNamespace);
        this.logger.log.info(`Module with namespace: ${module.name} was registered`);
        module.init(ioNamespace);
    }
}
