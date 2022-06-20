export type NumericId = number;

export type StringId = string;

export type SSL = {
    key: string;
    cert: string;
    ca: string;
};

export interface IServiceErrorBaseEvent {
    request: string,
    message: string,
}
