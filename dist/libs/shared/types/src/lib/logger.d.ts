export declare enum ELogTypes {
    appLog = "appLog",
    sysLog = "sysLog",
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
