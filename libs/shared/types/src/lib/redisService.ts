import {Socket} from "socket.io";

export type IRealtimeAppEvent = IRealtimeAppStatusEvent | IRealtimeAppTimingEvent;

export type IRealtimeAppStatusEvent = {
    id: number;
    type: string;
    status: string;
    statusChange: string;
};

export type IRealtimeAppTimingEvent = {
    id: number;
    type: string;
    startedAt: number;
};

export type IRealtimeNodeEvent = IRealtimeNodePingEvent | IRealtimeNodeSystemStateEvent | IRealtimeNodeStatusEvent;

export type IRealtimeNodeEventType = "ping" | "system" | "status";

export type IRealtimeNodePingEvent = {
    id: number;
    type: IRealtimeNodeEventType;
    lastPing: number;
};

export type IRealtimeNodeSystemStateEvent = {
    id: number;
    type: IRealtimeNodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
};

export type IRealtimeNodeStatusEvent = {
    id: number;
    type: IRealtimeNodeEventType;
    online: boolean;
};

export type IRedisAppChannelEvent = {
    nodeId: number;
    appId: number;
    appType: string;
};

export type IToKeyAppStateEvent = {
    nodeId: number;
    ip: string;
    port: number;
};

export type IToKeyAppStateData = {
    moment: number;
    bitrate: number;
    muxrate: number;
};

export type IMonitoringData = {
    channel: IToKeyAppStateEvent;
    data: IToKeyAppStateData;
};

export type IToKeyAppErrorStateEvent = {
    nodeId: number;
    ip: string;
    port: number;
    appType: string;
    appId: number;
};

export type IToKeyAppErrorStateData = {
    moment: number;
    syncLoss: number;
    syncByte: number;
    pat: number;
    cc: number;
    transport: number;
    pcrR: number;
    pcrD: number;
};

export type IMonitoringErrorsData = {
    channel: IToKeyAppErrorStateEvent;
    data: IToKeyAppErrorStateData;
};

export type IRedisModuleAppUnsubscribeEvent = IRedisModuleAppSubscribeEvent;

export type IRedisModuleNodeDataSubscribeEvent = {
    nodeId: number | number[];
    type: IRealtimeNodeEventType;
};

export type IRedisModuleAppSubscribeEvent =
    | IToKeyAppStateEvent
    | IToKeyAppErrorStateEvent
    | IRedisAppChannelEvent
    | IRedisModuleNodeDataSubscribeEvent;

export type IRedisModuleNodeDataUnsubscribeEvent = IRedisModuleNodeDataSubscribeEvent;

export type IRedisMessageType = IRealtimeAppEvent | IRealtimeNodeEvent;

export const isRealtimeAppEvent = (type: IRedisMessageType): type is IRealtimeAppEvent => {
    return "id" in type;
};
