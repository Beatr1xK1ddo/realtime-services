export declare type INodeInitEvent = {
    nodeId: number;
};
export declare type IClientSubscribeEvent = {
    nodeId: number;
    ip: string;
    port: number;
};
export declare type IClientCmdRequestEvent = {
    nodeId: number;
    ip: string;
    port: number;
    commands: string[];
};
export declare type IDeviceResponse = {
    data: string;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
export declare type IDeviceResponseEvent = {
    nodeId: number;
    ip: string;
    port: number;
    data?: string[];
    error?: string;
};
export declare type INodeMessage = {
    commands: string[];
    ip: string;
    port: number;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
