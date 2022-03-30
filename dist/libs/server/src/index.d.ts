/// <reference types="node" />
import { Namespace, Server } from 'socket.io';
import { IModule } from '@socket/interfaces';
export declare class NxtRealtimeServer {
    static namespaces: Map<string, Namespace>;
    static http: import("http").Server;
    static io: Server<import("socket.io/dist/typed-events").DefaultEventsMap, import("socket.io/dist/typed-events").DefaultEventsMap, import("socket.io/dist/typed-events").DefaultEventsMap, any>;
    reg(module: IModule): void;
}
