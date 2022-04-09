import {
    IClientCmdRequestEvent,
    IClientSubscribeEvent,
    IDeviceResponseEvent,
    NodeService,
} from '@socket/shared-types';
import { TeranexDevice } from './device';

export class TeranexNodeService extends NodeService<TeranexDevice> {
    public init() {
        this.socket.on('connect', async () => {
            this.logger.log.info('TeranexNodeService connected');
            this.socket.emit('init', { nodeId: this.nodeId });
        });
        this.socket.on('subscribe', this.handleSubscription.bind(this));
        this.socket.on('request', this.handleRequest.bind(this));
        this.socket.on('error', (error) => this.logger.log.error(error));
    }

    private async handleSubscription(event: {
        socketId: string;
        event: IClientSubscribeEvent;
    }) {
        const { ip, port } = event.event;
        const deviceId = `${ip}:${port}`;
        try {
            const device = await this.getDevice(deviceId);
            if (device) {
                this.socket.emit('subscribed', event);
                this.logger.log.info('Subscribing to device');
            }
        } catch (e) {
            //todo: add subscription failure handling
        }
    }

    private async handleRequest(data: IClientCmdRequestEvent) {
        const { ip, port, commands } = data;
        const deviceId = `${ip}:${port}`;

        try {
            const device = await this.getDevice(deviceId);
            const cmdAnswers = await Promise.all(
                commands.map(async (command: string) => {
                    try {
                        const answer = await device.command(command);
                        const data = this.format(answer);
                        this.logger.log.info('Command answer is: ', data);
                        return data;
                    } catch (e) {
                        this.logger.log.error('Command error', e);
                    }
                })
            );

            this.logger.log.info('Commands complete successfuly');

            this.socket.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                data: cmdAnswers,
            } as IDeviceResponseEvent);
        } catch (error) {
            this.logger.log.error('Error while handle request');

            this.socket.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseEvent);
        }
    }

    private async getDevice(deviceId: string): Promise<TeranexDevice> {
        if (this.devices[deviceId]) {
            return this.devices[deviceId];
        }

        const [ip, port] = deviceId.split(':');
        const newDevice = await this.createDevice(ip, parseInt(port));
        if (!newDevice) {
            this.logger.log.error(`Can not get device ${deviceId}`);
            throw new Error(`Can not get device ${deviceId}`);
        }
        this.devices[deviceId] = newDevice;
        return this.devices[deviceId];
    }

    private async createDevice(
        ip: string,
        port: number
    ): Promise<TeranexDevice | null> {
        try {
            const device = new TeranexDevice(ip, port);
            await device.command('ping\r\n');
            return device;
        } catch (e) {
            this.logger.log.error('Can not create device.', e);
            return null;
        }
    }

    private format(str: string) {
        return str.replace(/\n\n/g, '\n').replace(/ACK\n/, '');
    }
}
