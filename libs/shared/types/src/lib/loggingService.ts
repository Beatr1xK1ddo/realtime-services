import {Socket} from "socket.io";
import {Common} from "./common";

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
    appId: number;
    appType: string;
}
export interface ILogBaseTypeEvent extends ILogBaseTypesEvent {
    logType: string;
}

export interface ILogClientTypesEvent extends ILogBaseTypesEvent {
    nodeId: number;
}

export type ILogClientTypeEvent = ILogBaseTypeEvent & ILogClientTypesEvent;

export type ILogDbInsertEvent = ISysLogMessage | Array<ISysLogMessage> | IAppLogMessage | Array<IAppLogMessage>;

export namespace LoggingService {
    export enum EServiceLogType {
        app = "applicationLog",
        sys = "systemLog",
    }

    export type ILogFile = string;
    export type IAppName = string;
    export type IAppLogType = string;

    export interface INode {
        connection: Socket;
        apps: Map<Common.IAppType, Map<Common.IAppId, Set<IAppLogType>>>;
    }

    export interface IAppLogsTypes {
        appType: Common.IAppType;
        appId: Common.IAppId;
        appLogsTypes: Common.Optional<Array<IAppLogType>>;
    }

    export interface INodeInitEvent {
        nodeId: Common.INodeId;
        appsLogsTypes: Array<IAppLogsTypes>;
    }

    export interface INodeAppLogsTypesEvent extends IAppLogsTypes {
        nodeId: Common.INodeId;
    }

    export interface INodeBasicLogRecord {
        created: Common.ITimeInMs;
        message: string;
    }

    interface INodeBasicLogRecordsEvent {
        nodeId: Common.INodeId;
        serviceLogType: EServiceLogType;
        records: Array<INodeBasicLogRecord>;
    }

    export type INodeSysLogRecordsEvent = INodeBasicLogRecordsEvent;

    export interface INodeAppLogRecordsEvent extends INodeBasicLogRecordsEvent {
        appType: Common.IAppType;
        appId: Common.IAppId;
        appName: IAppName;
        appLogType: IAppLogType;
    }

    export type INodeLogRecordsEvent = INodeSysLogRecordsEvent | INodeAppLogRecordsEvent;

    interface IDbBasicLogRecord {
        nodeId: Common.INodeId;
        created: Date;
        message: string;
    }

    export type IDbSysLogRecord = IDbBasicLogRecord;

    export interface IDbAppLogRecord extends IDbBasicLogRecord {
        appType: Common.IAppType;
        appId: Common.IAppId;
        appName: IAppName;
        appLogType: IAppLogType;
    }

    export interface ISubscriberInitEvent {
        nodeId: Common.INodeId;
        appType: Common.IAppType;
        appId: Common.IAppId;
    }

    export interface ISubscribeAppLogsEvent extends ISubscriberInitEvent {
        appLogsTypes: Common.Optional<Array<IAppLogType>>;
    }

    export type IUnsubscribeAppLogsEvent = ISubscribeAppLogsEvent;
}
