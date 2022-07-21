import {IAppData, IPubSubData} from "@socket/shared-types";

export const isRealtimeAppData = (type: IPubSubData): type is IAppData => {
    return "appId" in type;
};
