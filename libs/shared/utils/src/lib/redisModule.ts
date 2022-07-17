import {
    EQosItem,
    IRedisAppChannelEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleNodeDataSubscribeEvent,
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

export const isIRedisModuleNodeDataSubscribeEvent = (
    data: IRedisModuleAppSubscribeEvent
): data is IRedisModuleNodeDataSubscribeEvent => {
    return data && "type" in data && "nodeId" in data;
};
