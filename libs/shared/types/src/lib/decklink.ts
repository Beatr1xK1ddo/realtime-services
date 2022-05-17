import {Socket} from "socket.io";

export type IDecklinkLiveMonitor = {
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
    status: string;
};

export type IDecklinkDeviceState = {
    [key: number]: IDecklinkLiveMonitor;
};

export type IDecklinkState = {
    sockets: Set<Socket>;
    deviceState?: IDecklinkDeviceState;
};

export type IDecklinkClientEvent = {
    devidePortId: number;
};

export const isIDecklinkClientEvent = (data: any): data is IDecklinkClientEvent => {
    return "devidePortId" in data && typeof data.devidePortId === "number";
};
