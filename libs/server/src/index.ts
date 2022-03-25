import { createServer } from 'http';
import { Namespace, Server } from 'socket.io';
import { IModule } from '@socket/interfaces';

export class NxtRealtimeServer {
    static namespaces: Map<string, Namespace> = new Map();
    private http;
    private io;

    constructor(port: number) {
        this.http = createServer();
        this.io = new Server(this.http).listen(port);
    }

    reg(module: IModule) {
        if (NxtRealtimeServer.namespaces.has(module.name)) {
            throw TypeError(
                `Module with namespace: ${module.name} already exists`
            );
        }
        const ioNamespace = this.io.of(`/${module.name}`);

        NxtRealtimeServer.namespaces.set(module.name, ioNamespace);

        module.init(ioNamespace);
    }
}
