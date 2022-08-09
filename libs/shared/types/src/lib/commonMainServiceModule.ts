import {Namespace} from "socket.io";

import {INodeDeviceServiceBaseEvent} from "./commonNodeService";

export interface IMainServiceModule {
    namespace: string;
    name: string;
    init(io: Namespace): void;
}

export type IMainServiceModuleDeviceSubscribeEvent = INodeDeviceServiceBaseEvent;

export type IMainServiceModuleDeviceUnsubscribeEvent = INodeDeviceServiceBaseEvent;

export interface IMainServiceModuleDeviceCommandsEvent extends INodeDeviceServiceBaseEvent {
    commands: string[];
}
