import {NumericId, StringId} from "./common";
import {IMainServiceModuleDeviceCommandsEvent, IMainServiceModuleDeviceSubscribeEvent} from "./commonMainServiceModule";

export interface INodeBaseEvent {
    nodeId: NumericId
}

export interface INodeDeviceServiceBaseEvent extends INodeBaseEvent{
    ip: string;
    port: number;
}

export interface INodeDeviceServiceCommandsResultEvent extends INodeDeviceServiceBaseEvent {
    data: string[];
}

export interface INodeDeviceServiceCommandsFailureEvent {
    clientId: StringId;
    origin: IMainServiceModuleDeviceCommandsEvent;
    error: string;
}

export interface INodeDeviceServiceSubscribedEvent {
    clientId: StringId;
    origin: IMainServiceModuleDeviceSubscribeEvent;
}
