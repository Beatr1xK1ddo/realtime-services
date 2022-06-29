import {
    IRedisAppChannelEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleNodeDataSubscribeEvent,
    IToKeyAppStateEvent,
    IToKeyAppErrorStateEvent,
} from "@socket/shared-types";

export const isIRedisAppChannelEvent = (data: IRedisModuleAppSubscribeEvent): data is IRedisAppChannelEvent => {
    return (
        data &&
        "appType" in data &&
        "appId" in data &&
        !("ip" in data) &&
        !!data.appId &&
        !!data.appType &&
        !!data.nodeId
    );
};

export const isIRedisToKeyAppErrorEvent = (data: IRedisModuleAppSubscribeEvent): data is IToKeyAppErrorStateEvent => {
    return (
        data &&
        "appType" in data &&
        "appId" in data &&
        "ip" in data &&
        "port" in data &&
        "nodeId" in data &&
        !!data.appType &&
        !!data.appId &&
        !!data.ip &&
        !!data.nodeId &&
        !!data.port
    );
};

export const isIRedisToKeyAppBitrateEvent = (data: IRedisModuleAppSubscribeEvent): data is IToKeyAppStateEvent => {
    return data && "ip" in data && "port" in data && "nodeId" in data && !!data.ip && !!data.nodeId && !!data.port;
};

export const isIRedisModuleNodeDataSubscribeEvent = (
    data: IRedisModuleAppSubscribeEvent
): data is IRedisModuleNodeDataSubscribeEvent => {
    return data && "type" in data && "nodeId" in data;
};
