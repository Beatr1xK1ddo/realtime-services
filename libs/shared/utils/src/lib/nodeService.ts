import {
    INodeBaseEvent,
    INodeDeviceServiceBaseEvent, INodeDeviceServiceCommandsFailureEvent, INodeDeviceServiceCommandsResultEvent,
    INodeDeviceServiceSubscribedEvent,
} from "@socket/shared-types";

export const eventToString = (event: INodeDeviceServiceBaseEvent): string => {
    return `${event.nodeId}/${event.ip}:${event.port}`;
}

export const testNodeDeviceServiceBaseEvent = (event: INodeDeviceServiceBaseEvent) => {
    return (
        typeof event === "object" &&
        typeof event.nodeId === "number" &&
        typeof event.ip === "string" &&
        typeof event.port === "number"
    );
}
export const testNodeDeviceServiceInitEvent = (event: INodeBaseEvent): boolean => {
    return typeof event === "object" && typeof event.nodeId === "number";
};

export const testNodeDeviceServiceSubscribedEvent = (event: INodeDeviceServiceSubscribedEvent): boolean => {
    //todo: proper validation
    return typeof event.clientId === "string";
};

export const testNodeDeviceServiceCommandsResultEvent = (event: INodeDeviceServiceCommandsResultEvent): boolean => {
    return testNodeDeviceServiceBaseEvent(event) && Array.isArray(event.data);
};

export const testNodeDeviceServiceCommandsFailureEvent = (event: INodeDeviceServiceCommandsFailureEvent): boolean => {
    //todo: proper validation
    return typeof event.clientId === "string" && typeof event.error === "string";
};
