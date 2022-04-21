export type IRealtimeAppEvent =
    | IRealtimeAppStatusEvent
    | IRealtimeAppTimingEvent;

export type IRealtimeAppStatusEvent = {
    id: number;
    type: string;
    status: string;
    statusChange: string;
};

export type IRealtimeAppTimingEvent = {
    id: number;
    type: string;
    startTime: number;
};

export type IRedisClientEvent = {
    nodeId: number;
    type: string;
    id: number;
};
