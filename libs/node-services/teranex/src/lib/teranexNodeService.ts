import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    NodeService,
} from '@socket/shared-types';
import { TeranexDevice } from './device';
import { ITeranexDevices } from './types';

export class TeranexNodeService extends NodeService {
    private devices: ITeranexDevices = {};

    init() {
        this.socket.on('connect', async () => {
            this.socket.emit('init', { nodeId: this.nodeId });
        });
        this.socket.on('request', this.handleRequest.bind(this));
        this.socket.on('error', (error) => console.log('Ooops: ', error));
    }

    private async handleRequest(data: IClientCmdRequestEvent) {
        console.log('handle request ...');
        const { ip, port, commands } = data;
        const deviceId = `${ip}:${port}`;
        const device = await this.getDevice(deviceId);
        try {
            if (device.busy) {
                this.socket.emit('response', {
                    nodeId: this.nodeId,
                    ip,
                    port,
                    error: 'Device is busy',
                } as IDeviceResponseEvent);
                return;
            }

            device.busy = true;
            let data = [];
            for (const cmd of commands) {
                data.push(await device.command(cmd));
            }
            device.busy = false;
            data = data.map((val) =>
                val.replace(/\n\n/g, '\n').replace(/ACK\n/, '')
            );
            this.socket.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                data,
            } as IDeviceResponseEvent);
        } catch (e) {
            this.clearDevice(deviceId);
            let error;
            if (e.code === 'ECONNREFUSED') {
                error = 'Device is unavailable';
            } else if (e.message === 'timeout') {
                error = 'Device timeout';
            } else {
                error = 'Device unknown error';
            }
            this.socket.emit('response', {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseEvent);
        }
    }

    async getDevice(deviceId: string): Promise<TeranexDevice> {
        if (this.devices[deviceId]) {
            return this.devices[deviceId];
        }
        try {
            const [ip, port] = deviceId.split(':');
            const device = new TeranexDevice(ip, parseInt(port));
            await device.connect();
            await device.command('ping\r\n');
            this.devices[deviceId] = device;
        } catch (e) {
            console.log('Ooops: ', e);
            this.devices[deviceId] = null;
        }
        return this.devices[deviceId];
    }

    clearDevice(deviceId: string) {
        this.devices[deviceId].destroy();
        this.devices[deviceId] = null;
    }
}
