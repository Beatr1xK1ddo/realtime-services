import {
    IMainServiceModuleDeviceCommandsEvent,
    IMainServiceModuleDeviceSubscribeEvent,
    IMainServiceModuleDeviceUnsubscribeEvent,
} from "@socket/shared-types";
import {testNodeDeviceServiceBaseEvent} from "./nodeService";

export const testMainServiceModuleDeviceSubscribeEvent = (event: IMainServiceModuleDeviceSubscribeEvent): boolean => {
    return testNodeDeviceServiceBaseEvent(event);
};

export const testMainServiceModuleDeviceUnsubscribeEvent = (
    event: IMainServiceModuleDeviceUnsubscribeEvent
): boolean => {
    return testNodeDeviceServiceBaseEvent(event);
};

export const testMainServiceModuleDeviceCommandsEvent = (event: IMainServiceModuleDeviceCommandsEvent): boolean => {
    return testNodeDeviceServiceBaseEvent(event);
};
