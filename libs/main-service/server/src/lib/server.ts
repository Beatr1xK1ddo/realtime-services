import { createServer } from 'https';
import { Namespace, Server } from 'socket.io';
import { IMainServiceModule } from '@socket/shared-types';
import { readFileSync } from 'fs';

import * as config from './config.json';
import { PinoLogger } from '@socket/shared-utils';

export class MainServiceServer {
    static namespaces: Map<string, Namespace> = new Map();
    private https;
    private io;
    private logger = new PinoLogger();

    constructor(port: number) {
        this.logger.log.info(`Creating server on ${port} using ${config.ssl.key} ${config.ssl.crt}`);
        this.https = createServer({
            key: readFileSync(config.ssl.key),
            cert: readFileSync(config.ssl.crt),
        }).listen(port);
        this.io = new Server(this.https, { cors: { origin: '*' } });
        this.logger.log.info(`Server running on ${port}`);
    }

    registerModule(module: IMainServiceModule) {
        this.logger.log.info(`Registering module ${module.name}`);
        if (MainServiceServer.namespaces.has(module.name)) {
            this.logger.log.error(
                `Module with namespace: ${module.name} already exists`
            );
            throw TypeError(
                `Module with namespace: ${module.name} already exists`
            );
        }
        const ioNamespace = this.io.of(`/${module.name}`);

        MainServiceServer.namespaces.set(module.name, ioNamespace);
        this.logger.log.info(`Module with namespace: ${module.name} was registered`);
        module.init(ioNamespace);
    }
}
