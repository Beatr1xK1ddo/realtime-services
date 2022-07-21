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

export interface ISubscribeEvent {
    subscriptionType: ESubscriptionType;
    origin: IIpPortOrigin | IAppIdAppTypeOrigin | INodeSubscribeOrigin;
}

export type IUnsubscribeEvent = ISubscribeEvent;

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

export type IAppData = IAppStatusData | IAppTimingData;

export interface IAppStatusData {
    appId: number;
    appType: string;
    status: string;
    statusChange: string;
}

export interface IAppTimingData {
    appId: number;
    type: string;
    startedAt: number;
}

export type INodeData = INodePingData | INodeSystemStateData | INodeStatusData;

export type INodeEventType = "ping" | "system" | "status";

export interface INodePingData {
    id: number;
    type: INodeEventType;
    lastPing: number;
}

export interface INodeSystemStateData {
    id: number;
    type: INodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
}

export interface INodeStatusData {
    id: number;
    type: INodeEventType;
    online: boolean;
}

export type IPubSubData = INodeData | IAppData;

export interface IDataEvent extends ISubscribeEvent {
    payload: IMonitoringData | Array<IMonitoringData> | IQosData | IPubSubData;
}
