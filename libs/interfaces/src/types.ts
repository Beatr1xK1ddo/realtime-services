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
    applog = 'applog',
    syslog = 'syslog',
    all = 'all',
}

export type ISyslogMessage = {
    type: ELogTypes.syslog;
    message: string;
    created: number;
    appId: number;
    appType: string;
    appName: string;
    subType: string;
    nodeId: number;
};

export type IApplogMessage = {
    type: ELogTypes.applog;
    message: string;
    created: number;
    nodeId: number;
};

export type ILogMessage = ISyslogMessage | IApplogMessage;
