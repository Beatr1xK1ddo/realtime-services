import { IModule } from '@socket/interfaces';
import { Namespace } from 'socket.io';
import { IAppInstallFiles } from './types';
export declare class AppInstall implements IModule {
    private watcher;
    name: string;
    private path;
    private io?;
    files: Map<string, IAppInstallFiles>;
    constructor(name: string, path: string);
    init(io: Namespace): void;
    private onConnection;
    private run;
    parseNodeId(filepath: string): number;
    getDiffContent(filepath: string): Promise<unknown>;
    sendData(node: any, data: any): void;
}
