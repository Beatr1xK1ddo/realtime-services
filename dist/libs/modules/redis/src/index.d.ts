import { IModule } from '@socket/interfaces';
import { Namespace } from 'socket.io';
export declare class NxtRedis implements IModule {
    name: string;
    private io?;
    private redis;
    constructor(name: string);
    init(io: Namespace): void;
    private handleConnection;
    onMessage(msg: any): Promise<unknown>;
}
