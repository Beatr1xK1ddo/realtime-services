export type INodeEvent = {nodeId: number};

export type IServerModuleMessage = {
    message: string;
};

export type IClientSubscribeEvent = {
    nodeId: number;
    ip: string;
    port: number;
};

export type IClientSubscribedEvent = {socketId: string; event: IClientSubscribeEvent};

export type IClientCmdRequestEvent = {
    nodeId: number;
    ip: string;
    port: number;
    commands: string[];
};

export type IDeviceResponse = {
    data: string;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};

export type IDeviceResponseEvent = {
    nodeId: number;
    ip: string;
    port: number;
    data: string[];
};

export type IDeviceResponseError = {
    nodeId: number;
    ip: string;
    port: number;
    error: any;
};

export type INodeMessage = {
    commands: string[];
    ip: string;
    port: number;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};

export const isClientSubscribeEvet = (
    event: IClientSubscribeEvent
): event is IClientSubscribeEvent =>
    typeof event === "object" &&
    typeof event.nodeId === "number" &&
    typeof event.ip === "string" &&
    typeof event.port === "number";

export enum EErrorTypes {
    incorrectRequest = "Request is incorrect.",
}
