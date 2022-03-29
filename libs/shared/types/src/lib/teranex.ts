export type IClientMessage = {
    ip: string;
    port: number;
    commands: string[];
};

export type IDeviceResponse = {
    data: string;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
export type IDeviceResponseData = {
    data: string[];
    ip: string;
    port: number;
};

export type INodeMessage = {
    commands: string[];
    ip: string;
    port: number;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
