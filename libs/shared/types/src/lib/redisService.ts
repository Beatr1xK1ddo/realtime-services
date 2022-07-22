export enum ESubscriptionType {
    monitoring = "monitoring",
    qos = "qos",
    node = "node",
    app = "app",
}

export interface IOnDataHandler {
    (key: string, data: string): void;
}

export interface INodeSubscribeOrigin {
    nodeId: number | number[];
    type: INodeEventType;
}

export interface IIpPortOrigin {
    nodeId: number;
    ip: string;
    port: number;
}

export interface IAppIdAppTypeOrigin {
    nodeId: number;
    appId: number;
    appType: string;
}

export interface ISubscribeEvent<T = any> {
    subscriptionType: ESubscriptionType;
    origin: T;
}

export type IUnsubscribeEvent<T = any> = ISubscribeEvent<T>;

export interface IMonitoringRowData {
    time: number;
    tsTotalRate: number;
    tsDataRate: number;
    p1Stats: {
        syncLosses: number;
        ccErrors: number;
    };
}

export interface IMonitoringData {
    moment: number;
    monitoring: {
        bitrate: number;
        muxrate: number;
    };
    errors: {
        syncLosses: number;
        cc: number;
    };
}

export enum EQosItem {
    good,
    warning,
    bad,
}

export interface IQosData {
    items: Array<EQosItem>;
    quality: number;
}

export type IAppDataRow = IAppStatusDataRaw | IAppTimingDataRaw;

export type IAppData = IAppStatusData | IAppTimingData;

export interface IAppStatusDataRaw {
    appId: number;
    appType: string;
    status: string;
    statusChange: string;
}

export interface IAppTimingDataRaw {
    appId: number;
    type: string;
    startedAt: number;
}

export type IAppStatusData = Omit<IAppStatusDataRaw, "appId" | "appType">;

export type IAppTimingData = Omit<IAppTimingDataRaw, "appId" | "type">;

export type INodeDataRow = INodePingDataRow | INodeSystemStateDataRow | INodeStatusDataRow;

export type INodeData = INodePingData | INodeSystemStateData | INodeStatusData;

export type INodeEventType = "ping" | "system" | "status";

export interface INodePingDataRow {
    id: number;
    type: INodeEventType;
    lastPing: number;
}

export type INodePingData = Omit<INodePingDataRow, "id">;

export interface INodeSystemStateDataRow {
    id: number;
    type: INodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
}

export type INodeSystemStateData = Omit<INodeSystemStateDataRow, "id">;

export interface INodeStatusDataRow {
    id: number;
    type: INodeEventType;
    online: boolean;
}

export type INodeStatusData = Omit<INodeStatusDataRow, "id">;

export type IPubSubData = INodeDataRow | IAppDataRow;

export interface IDataEvent<T, P> extends ISubscribeEvent<T> {
    // payload: IMonitoringData | Array<IMonitoringData> | IQosData | IPubSubData;
    payload: P;
}

export interface IDataEvent<T, P> extends ISubscribeEvent<T> {
    // payload: IMonitoringData | Array<IMonitoringData> | IQosData | INodeData | IAppData;
    payload: P;
}

export type ISubscribedEvent<T, P> = IDataEvent<T, P>;

export interface IAppDataSubscribedEvent {
    status: IAppStatusData;
    runtime: IAppTimingData;
}
