import {
    IClientCmdRequestEvent,
    IClientSubscribeEvent,
    IDeviceResponseEvent,
    NodeDeviceService,
    NodeServiceOptions,
} from '@socket/shared-types';
import { TeranexDevice } from './device';

export class TeranexNodeService extends NodeDeviceService<TeranexDevice> {
    constructor(
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        super(name, nodeId, mainServiceUrl, options);
        this.registerHandler('subscribe', this.handleSubscription.bind(this));
        this.registerHandler('request', this.handleRequest.bind(this));
    }

    protected onConnected() {
        super.onConnected();
        this.emit('init', { nodeId: this.nodeId });
    }

    private async handleSubscription(event: {
        socketId: string;
        event: IClientSubscribeEvent;
    }) {
        const { ip, port } = event.event;
        try {
            const device = await this.getDevice(ip, port);
            if (device) this.emit('subscribed', event);
        } catch (e) {
            //todo: add subscription failure handling
        }
    }

    private async handleRequest(data: IClientCmdRequestEvent) {
        const { ip, port, commands } = data;
        try {
            const device = await this.getDevice(ip, port);
            const result = [];
            for (const command of commands) {
                const commandResult = await device.sendCommand(command);
                result.push(TeranexNodeService.format(commandResult));
            }
            this.log(`commands processed ${JSON.stringify(result)}`);
            this.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                data: result,
            } as IDeviceResponseEvent);
        } catch (error) {
            this.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseEvent);
        }
    }

    private async getDevice(ip: string, port: number): Promise<TeranexDevice> {
        const deviceId = `${ip}:${port}`;
        if (this.devices[deviceId]) {
            return this.devices[deviceId];
        }
        const newDevice = await TeranexNodeService.createDevice(ip, port);
        if (!newDevice) {
            this.log(`can't create device ${deviceId}`, true);
            throw new Error(`Can't create device ${deviceId}`);
        }
        this.devices[deviceId] = newDevice;
        return this.devices[deviceId];
    }

    private static async createDevice(
        ip: string,
        port: number
    ): Promise<TeranexDevice | null> {
        try {
            const device = new TeranexDevice(ip, port);
            await device.sendCommand('ping\r\n');
            return device;
        } catch (e) {
            return null;
        }
    }

    private static format(str: string) {
        return str.replace(/\n\n/g, '\n').replace(/ACK\n/, '');
    }
}
