import { IModule } from '@socket/interfaces';
import { Namespace } from 'socket.io';
import { TeranexDevice } from './device';
export declare class Teranex implements IModule {
    name: string;
    private io?;
    private messages;
    private devices;
    private blocked;
    constructor();
    init(io: Namespace): void;
    private onConnection;
    _handleMessages(): Promise<void>;
    _getDevice(DEVICE_ID: any): Promise<TeranexDevice>;
    onMessage(data: string): Promise<unknown>;
    _onMessage(req: any): Promise<void>;
}
