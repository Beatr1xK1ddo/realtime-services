export enum ELogTypes {
    appLog = "appLog",
    sysLog = "sysLog",
    all = "all",
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

export type ILoggerRequestPayload = {nodeId: number; logType: ELogTypes};
