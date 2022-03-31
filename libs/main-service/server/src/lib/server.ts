import { createServer } from 'https';
import { Namespace, Server } from 'socket.io';
import { IMainServiceModule } from '@socket/shared-types';
import { readFileSync } from 'fs';

import * as config from './config.json';

export class MainServiceServer {
    static namespaces: Map<string, Namespace> = new Map();
    private https;
    private io;

    constructor(port: number) {
        this.https = createServer({
            key: readFileSync(config.ssl.key),
            cert: readFileSync(config.ssl.crt),
        });
        this.io = new Server(this.https, { cors: { origin: '*' } }).listen(
            port
        );
    }

    registerModule(module: IMainServiceModule) {
        if (MainServiceServer.namespaces.has(module.name)) {
            throw TypeError(
                `Module with namespace: ${module.name} already exists`
            );
        }
        const ioNamespace = this.io.of(`/${module.name}`);

        MainServiceServer.namespaces.set(module.name, ioNamespace);

        module.init(ioNamespace);
    }
}
