import {
    IRedisGetAppErrorEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleAppUnsubscribeEvent,
    IRedisSubAppSubscribeEvent,
    IRedisSubAppUnsubscribeEvent,
} from "@socket/shared-types";

export const isIRedisSubAppSubscribeEvent = (
    data: IRedisModuleAppSubscribeEvent
): data is IRedisSubAppSubscribeEvent => {
    return data && "appType" in data && "appId" in data && !("ip" in data);
};

export const isIRedisGetAppErrorEvent = (data: IRedisModuleAppSubscribeEvent): data is IRedisGetAppErrorEvent => {
    return data && "appType" in data && "appId" in data && "ip" in data && "port" in data && "nodeId" in data;
};

export const isIRedisSubModuleAppUnsubscribeEvent = (
    data: IRedisModuleAppUnsubscribeEvent
): data is IRedisSubAppUnsubscribeEvent => {
    return data && !("messageType" in data);
};
