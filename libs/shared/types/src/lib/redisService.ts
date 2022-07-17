export type IRealtimeAppEvent = IRealtimeAppStatusEvent | IRealtimeAppTimingEvent;

export enum ESubscriptionType {
    monitoring = "monitoring",
    qos = "qos",
}

interface IBasicSubscribeEvent {
    subscriptionType: ESubscriptionType;
}

export interface IMonitoringBaseEvent {
    nodeId: number;
    ip: string;
    port: number;
}

export interface IRealtimeAppStatusEvent {
    id: number;
    type: string;
    status: string;
    statusChange: string;
}

export interface IRealtimeAppTimingEvent {
    id: number;
    type: string;
    startedAt: number;
}

export type IRealtimeNodeEvent = IRealtimeNodePingEvent | IRealtimeNodeSystemStateEvent | IRealtimeNodeStatusEvent;

export type IRealtimeNodeEventType = "ping" | "system" | "status";

export interface IRealtimeNodePingEvent {
    id: number;
    type: IRealtimeNodeEventType;
    lastPing: number;
}

export interface IRealtimeNodeSystemStateEvent {
    id: number;
    type: IRealtimeNodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
}

export interface IRealtimeNodeStatusEvent {
    id: number;
    type: IRealtimeNodeEventType;
    online: boolean;
}

export interface IRedisAppChannelEvent {
    nodeId: number;
    appId: number;
    appType: string;
}

export type IRedisModuleAppUnsubscribeEvent = IRedisModuleAppSubscribeEvent;

export interface IRedisModuleNodeDataSubscribeEvent {
    nodeId: number | number[];
    type: IRealtimeNodeEventType;
}

export type IMonitoringSubscribeEvent = IBasicSubscribeEvent & IMonitoringBaseEvent;

export interface IMonitoringSubscribedEvent extends IMonitoringSubscribeEvent {
    payload: Array<IMonitoringPayloadItem>;
}

export interface IMonitoringRowData {
    time: number;
    tsTotalRate: number;
    tsDataRate: number;
    p1Stats: {
        syncLosses: number;
        ccErrors: number;
    };
}

export interface IMonitoringPayloadItem {
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

export interface IMonitoringDataEvent extends IMonitoringSubscribeEvent {
    payload: IMonitoringPayloadItem;
}

export type IRedisModuleAppSubscribeEvent =
    | IMonitoringSubscribeEvent
    | IRedisAppChannelEvent
    | IRedisModuleNodeDataSubscribeEvent
    | IQosSubscribeEvent;

export type IRedisModuleNodeDataUnsubscribeEvent = IRedisModuleNodeDataSubscribeEvent;

export type IRedisMessageType = IRealtimeAppEvent | IRealtimeNodeEvent;

export const isRealtimeAppEvent = (type: IRedisMessageType): type is IRealtimeAppEvent => {
    return "id" in type;
};

export enum EQosItem {
    good,
    warning,
    bad,
}

export interface IQosDataPayload {
    items: Array<EQosItem>;
    quality: number;
}

export interface IQosSubscribeEvent extends IBasicSubscribeEvent {
    nodeId: number;
    appId: number;
    appType: string;
}

export interface IQosDataEvent extends IQosSubscribeEvent {
    payload: IQosDataPayload;
}
