import {createServer} from "https";
import {Namespace, Server} from "socket.io";
import {readFileSync} from "fs";

import type {IMainServiceModule, SSL} from "@socket/shared-types";
import {BasicLogger, IBasicLoggerOptions} from "@socket/shared/entities";

type MainServiceServerOptions = {
    ssl: SSL;
    logger?: Partial<IBasicLoggerOptions>;
};

export class MainServiceServer {
    static namespaces: Map<string, Namespace> = new Map();
    private https;
    private io: Server;
    private logger: BasicLogger;

    constructor(port: number, options: MainServiceServerOptions) {
        this.https = createServer({
            key: readFileSync(options.ssl.key),
            cert: readFileSync(options.ssl.cert),
        }).listen(port);
        //todo: handle cors more precisely
        this.io = new Server(this.https, {cors: {origin: "*"}});
        this.logger = new BasicLogger(options.logger?.name, options.logger?.level, options.logger?.path);
    }

    registerModule(module: IMainServiceModule) {
        this.logger.log.info(`${module.name} module registering with namespace ${module.namespace}`);
        if (MainServiceServer.namespaces.has(module.namespace)) {
            this.logger.log.error(`MainServiceServer ERROR: failed to register ${module.name} namespace ${module.namespace} already exists`);
            throw TypeError(`MainServiceServer ERROR: failed to register ${module.name} namespace ${module.namespace} already exists`);
        }
        const ioNamespace = this.io.of(`/${module.namespace}`);
        MainServiceServer.namespaces.set(module.namespace, ioNamespace);
        this.logger.log.info(`${module.name} module with namespace: ${module.namespace} registered successfully`);
        module.init(ioNamespace);
    }
}
