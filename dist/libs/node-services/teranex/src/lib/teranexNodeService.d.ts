import { NodeService } from '@socket/shared-types';
import { TeranexDevice } from './device';
export declare class TeranexNodeService extends NodeService {
    private devices;
    init(): void;
    private handleRequest;
    getDevice(deviceId: string): Promise<TeranexDevice>;
    clearDevice(deviceId: string): void;
}
