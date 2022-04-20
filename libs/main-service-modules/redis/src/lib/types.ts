export enum EMessageActions {
    get = 'get',
    set = 'set',
    delete = 'delete',
}

export type IRedisResponse = {
    success: boolean;
    data?: any;
    error?: Error;
};

export type IRedisRequest = {
    action: EMessageActions;
    data: any;
};

export const isIRedisRequest = (data: IRedisRequest): data is IRedisRequest => {
    return data.action && (data.action as string) in EMessageActions;
};
