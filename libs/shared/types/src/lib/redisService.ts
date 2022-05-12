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

export type IRealtimeNodeEvent = IRealtimeNodePingEvent |  IRealtimeNodeSystemStateEvent | IRealtimeNodeStatusEvent;

export type IRealtimeNodeEventType = "ping" | "system" | "status";

export type IRealtimeNodePingEvent = {
    type: IRealtimeNodeEventType;
    lastPing: number;
};

export type IRealtimeNodeSystemStateEvent = {
    type: IRealtimeNodeEventType;
    cpu: number,
    memoryUsed: number,
    memoryTotal: number,
    loadAverage: number
};

export type IRealtimeNodeStatusEvent = {
    type: IRealtimeNodeEventType;
    online: boolean
};

export type IRedisModuleAppDataSubscribeEvent = {
    nodeId: number;
    appId: number;
    appType: string;
};

export type IRedisModuleNodeDataSubscribeEvent = {
    nodeId: number;
    type: IRealtimeNodeEventType;
};
