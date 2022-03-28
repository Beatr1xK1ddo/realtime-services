import {Namespace} from "socket.io";

export interface IModule {
    name: string;
    init(io: Namespace): void;
}

