import { IModule } from '@socket/interfaces';
import { Namespace } from 'socket.io';
export declare class Monitor implements IModule {
    name: string;
    private io?;
    private db?;
    private queries;
    private url;
    private redis;
    private lastRuntime?;
    constructor(name: string);
    init(io: Namespace): Promise<void>;
    private onConnection;
    private connectDb;
    private onData;
    startMonitor(): Promise<void>;
    handleErrors(app: any, sqlRec: any): Promise<void>;
    parseMonitorAlerts(alerts: string[]): any;
    sendData(errorType: string, errorTime: number | null, errorHistory?: any, sqlRec?: any, replyCount?: any): void;
    fetchHistory(sqlRec: any): Promise<unknown>;
}
