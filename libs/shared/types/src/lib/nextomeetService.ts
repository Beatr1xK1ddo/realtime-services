export type IClientNextomeetReqEvent = {
    nodeId: number;
    cmd: string;
    params: IClientNextomeetParams;
};
export type IClientNextomeetSubEvent = {
    nodeId: number;
};

export type IClientNextomeetResEvent = {
    nodeId: number;
    data?: any;
    success: boolean;
    error?: any;
};

export type IClientNextomeetParams = {
    nextomeetId: number;
    userId: number;
    sdiPort: number;
};
