export type IAppLogMessage = {
    message: string;
    created: number;
    appId: number;
    appType: string;
    appName: string;
    subType: string;
    nodeId: number;
};

export type ISysLogMessage = {
    message: string;
    created: number;
    nodeId: number;
};

export interface ILogBaseTypesEvent {
    appType: string;
    appId: number;
}
export interface ILogBaseTypeEvent extends ILogBaseTypesEvent {
    logType: string;
}

export interface ILogClientTypesEvent extends ILogBaseTypesEvent {
    nodeId: number;
}

export type ILogClientTypeEvent = ILogBaseTypeEvent & ILogClientTypesEvent;

export interface ILogNodeTypesDataEvent {
    channel: ILogClientTypesEvent;
    data: Array<string>;
}

export type ILogDbInsertEvent = ISysLogMessage | Array<ISysLogMessage> | IAppLogMessage | Array<IAppLogMessage>;
