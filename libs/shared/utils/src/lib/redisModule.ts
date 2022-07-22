import {
    IAppDataRow,
    IAppStatusDataRaw,
    IAppTimingDataRaw,
    INodeDataRow,
    INodePingDataRow,
    INodeStatusDataRow,
    INodeSystemStateDataRow,
    IPubSubData,
} from "@socket/shared-types";

// app
export const isRealtimeAppData = (type: IPubSubData): type is IAppDataRow => {
    return "appId" in type;
};

export const isIAppStatusDataRaw = (type: IAppDataRow): type is IAppStatusDataRaw => {
    return type && "status" in type;
};

export const isIAppTimingDataRaw = (type: IAppDataRow): type is IAppTimingDataRaw => {
    return type && "startedAt" in type;
};

// node
export const isRealtimeNodeData = (type: IPubSubData): type is INodeDataRow => {
    return type && "id" in type && "type" in type;
};
