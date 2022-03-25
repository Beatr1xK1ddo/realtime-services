import { Namespace } from 'socket.io';
import { Socket, io } from 'socket.io-client';

export interface IModule {
    name: string;
    init(io: Namespace): void;
}

export abstract class DataProducer {
    protected socket: Socket;
    protected url: string;

    constructor(url: string) {
        this.url = url;
        this.socket = io(this.url);
    }

    abstract init(): void;

    // protected send<T>(data: T): void {
    //     throw TypeError('The child class must overrides "send" method.');
    // }
}

export enum ELogTypes {
    appLog = 'applog',
    sysLog = 'syslog',
    all = 'all',
}

export type ISysLogMessage = {
    type: ELogTypes.sysLog;
    message: string;
    created: number;
    appId: number;
    appType: string;
    appName: string;
    subType: string;
    nodeId: number;
};

export type IAppLogMessage = {
    type: ELogTypes.appLog;
    message: string;
    created: number;
    nodeId: number;
};

export type ILogData = {
    nodeId: number;
    data: ISysLogMessage | IAppLogMessage;
};
