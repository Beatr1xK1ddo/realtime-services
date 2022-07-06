import {IAppLogMessage, ILogDbInsertEvent} from "@socket/shared-types";

export const isIAppLogMessage = (data: ILogDbInsertEvent): data is IAppLogMessage | Array<IAppLogMessage> => {
    if (Array.isArray(data)) {
        return data[0] && "appType" in data[0] && "appId" in data[0] && "appName" in data[0];
    }
    return data && "appType" in data && "appId" in data && "appName" in data;
};
