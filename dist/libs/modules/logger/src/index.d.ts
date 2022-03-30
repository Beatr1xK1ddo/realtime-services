import { Namespace } from 'socket.io';
import { IModule } from '@socket/interfaces';
export declare class Logger implements IModule {
    private dbURL;
    private db;
    name: string;
    private io?;
    private clients;
    constructor(name: string);
    init(io: Namespace): Promise<void>;
    private onConnection;
    private dbConnection;
    private createCollections;
    private logHandler;
    get collections(): {
        [index: string]: import("mongoose").Collection<import("mongoose").AnyObject>;
    };
}
