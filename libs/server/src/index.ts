import { createServer } from 'http';
import { Namespace, Server } from 'socket.io';
import { IModule } from '@socket/interfaces';

export class NxtRealtimeServer {
    static namespaces: Map<string, Namespace> = new Map();
    static http = createServer();
    static io = new Server(NxtRealtimeServer.http, {
        cors: {
            origin: 'http://localhost:3001',
        },
    }).listen(3000);

    reg(module: IModule) {
        if (NxtRealtimeServer.namespaces.has(module.name)) {
            throw TypeError(
                `Module with namespace: ${module.name} already exists`
            );
        }
        const ioNamespace = NxtRealtimeServer.io.of(`/${module.name}`);

        NxtRealtimeServer.namespaces.set(module.name, ioNamespace);

        module.init(ioNamespace);
    }
}
