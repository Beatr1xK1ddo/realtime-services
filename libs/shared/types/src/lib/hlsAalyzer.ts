export type IHlsMessage = {
    channel: string;
};

export const isHlsMessage = (data: any): data is IHlsMessage => {
    return typeof data === "object" && data !== null && "chanel" in data;
};
