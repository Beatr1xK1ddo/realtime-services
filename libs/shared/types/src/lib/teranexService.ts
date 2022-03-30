export type INodeInitEvent = { nodeId: number };
export type IClientSubscribeEvent = { nodeId: number, ip: string, port: number };

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
    data?: string[];
    error?: string;
};

export type INodeMessage = {
    commands: string[];
    ip: string;
    port: number;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
