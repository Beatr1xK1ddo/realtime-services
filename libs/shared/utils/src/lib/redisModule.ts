import {
    IRedisAppChannelEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleNodeDataSubscribeEvent,
    IRedisToKeyAppBitrateEvent,
    IRedisToKeyAppErrorEvent,
} from "@socket/shared-types";

export const isIRedisAppChannelEvent = (data: IRedisModuleAppSubscribeEvent): data is IRedisAppChannelEvent => {
    return data && "appType" in data && "appId" in data && !("ip" in data);
};

export const isIRedisToKeyAppErrorEvent = (data: IRedisModuleAppSubscribeEvent): data is IRedisToKeyAppErrorEvent => {
    return data && "appType" in data && "appId" in data && "ip" in data && "port" in data && "nodeId" in data;
};

export const isIRedisToKeyAppBitrateEvent = (
    data: IRedisModuleAppSubscribeEvent
): data is IRedisToKeyAppBitrateEvent => {
    return data && "ip" in data && "port" in data && "nodeId" in data;
};

export const isIRedisModuleNodeDataSubscribeEvent = (
    data: IRedisModuleAppSubscribeEvent
): data is IRedisModuleNodeDataSubscribeEvent => {
    return data && "type" in data && "nodeId" in data;
};
