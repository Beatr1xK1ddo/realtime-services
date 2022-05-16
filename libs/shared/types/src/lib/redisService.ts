import {Socket} from "socket.io";
import {IPinoOptions} from "./pinoLogerService";

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
    type: IRealtimeNodeEventType;
    lastPing: number;
};

export type IRealtimeNodeSystemStateEvent = {
    type: IRealtimeNodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
};

export type IRealtimeNodeStatusEvent = {
    type: IRealtimeNodeEventType;
    online: boolean;
};

export type IRedisModuleAppDataSubscribeEvent = {
    nodeId: number;
    appId: number;
    appType: string;
};

export type IRedisModuleAppDataUnsubscribeEvent = IRedisModuleAppDataSubscribeEvent;

export type IRedisModuleNodeDataSubscribeEvent = {
    nodeId: number | number[];
    type: IRealtimeNodeEventType;
};

export type IRedisModuleNodeDataUnsubscribeEvent = IRedisModuleNodeDataSubscribeEvent;

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IPinoOptions>;
};

export type IClients = Map<string, Map<number, Set<Socket>>> | Map<string, Map<string, Set<Socket>>>;

export type IRedisMessageType = IRealtimeAppEvent | IRealtimeNodeEvent;

export const isRealtimeAppEvent = (type: IRedisMessageType): type is IRealtimeAppEvent => {
    return "id" in type;
};
