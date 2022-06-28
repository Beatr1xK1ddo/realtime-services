import {NumericId, StringId} from "./common";

export type IDeckLinkDeviceStatus = "Init" | "Available" | "Busy" | "No Signal";

export interface IDeckLinkDevice {
    id: number;
    status: IDeckLinkDeviceStatus;
    detectedMode: string;
    pixelFormat: string;
}

export interface IDeckLinkDeviceResponse {
    current_flags: string;
    current_mode: string;
    detected_flags: string;
    detected_mode: string;
    id: number;
    input: number;
    input_name: string;
    locked: string;
    modes: string[];
    name: string;
    pixel_format: string;
    status: IDeckLinkDeviceStatus;
}

export type IDeckLinkDevicesResponse = Array<{id: number}>;

export type IBmddNodeServiceInitEvent = IBmddNodeServiceDevicesEvent;

export interface IBmddNodeServiceErrorEvent {
    nodeId: NumericId;
    message: string;
}

export interface IBmddNodeServiceDevicesEvent {
    nodeId: NumericId;
    devices: {[id: number]: IDeckLinkDevice};
}

export interface IBmddNodeServiceSubscribeEvent {
    clientId: StringId
}

export interface IBmddNodeServiceSubscribedEvent extends IBmddNodeServiceDevicesEvent {
    clientId: StringId
}

export interface IBmddServiceModuleErrorEvent {
    nodeId?: NumericId;
    message: string;
}
