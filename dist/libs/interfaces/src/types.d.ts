import { Namespace } from 'socket.io';
import { Socket } from 'socket.io-client';
export interface IModule {
    name: string;
    init(io: Namespace): void;
}
export declare abstract class DataProducer {
    protected socket: Socket;
    protected url: string;
    constructor(url: string);
    abstract init(): void;
}
export declare enum ELogTypes {
    appLog = "applog",
    sysLog = "syslog",
    all = "all"
}
export declare type ISysLogMessage = {
    type: ELogTypes.sysLog;
    message: string;
    created: number;
    appId: number;
    appType: string;
    appName: string;
    subType: string;
    nodeId: number;
};
export declare type IAppLogMessage = {
    type: ELogTypes.appLog;
    message: string;
    created: number;
    nodeId: number;
};
export declare type ILogData = {
    nodeId: number;
    data: ISysLogMessage | IAppLogMessage;
};
