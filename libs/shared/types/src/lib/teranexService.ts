export type IDeviceResponse = {
    data: string;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};

export type IDeviceResponseError = {
    nodeId: number;
    ip: string;
    port: number;
    error: any;
};
