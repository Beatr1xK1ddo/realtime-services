import { TeranexDevice } from './device';

export type IDeviceMessage = {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
    data: string;
};

export type IDevices = {
    [key: string]: TeranexDevice;
};
