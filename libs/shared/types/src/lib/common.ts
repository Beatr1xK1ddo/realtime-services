export type NumericId = number;

export type StringId = string;

export type SSL = {
    key: string;
    cert: string;
    ca: string;
};

export enum IServiceCommonFaultOrigin {
    main = "main service",
    node = "node service",
}

export enum IServiceCommonFaultType {
    init = "init",
    disconnected = "disconnected",
    event = "event",
}

export interface IServiceCommonFaultEvent {
    origin: IServiceCommonFaultOrigin;
    type: IServiceCommonFaultType;
    event?: string;
    message?: string;
}

export interface INodeServiceCommonFaultEvent extends IServiceCommonFaultEvent {
    nodeId: NumericId;
}

export namespace Common {
    //utils
    export type Optional<T> = null | T;
    //common
    export type ITimeInMs = number;
    export type INumericId = number;
    export type IStringId = string;
    //node
    export type INodeId = INumericId;
    //app
    export type IAppId = INumericId;
    export type IAppType = string;
}
