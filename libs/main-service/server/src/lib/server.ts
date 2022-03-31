import { createServer } from 'https';
import { Namespace, Server } from 'socket.io';
import { IMainServiceModule } from '@socket/shared-types';
import * as config from './config.json';
import { readFileSync } from 'fs';

export class MainServiceServer {
    static namespaces: Map<string, Namespace> = new Map();
    private http;
    private io;

    constructor(port: number) {
        this.http = createServer({
            key: readFileSync(config.ssl.key),
            cert: readFileSync(config.ssl.crt),
        });
        this.io = new Server(this.http, { cors: { origin: '*' } }).listen(port);
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
