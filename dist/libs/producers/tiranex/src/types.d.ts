import { TeranexDevice } from './device';
export declare type IDeviceMessage = {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
    data: string;
};
export declare type IDevices = {
    [key: string]: TeranexDevice;
};
