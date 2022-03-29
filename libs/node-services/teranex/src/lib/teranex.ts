import {
    IDeviceResponseData,
    INodeMessage,
    NodeService,
} from '@socket/shared-types';
import { TeranexDevice } from './device';
import { IDevices } from './types';
import { IClientMessage } from '@socket/shared-types';

export class Teranex extends NodeService {
    private messages: INodeMessage[] = [];
    private devices: IDevices = {};
    private blocked = false;

    constructor(url: string) {
        super(url);
        setInterval(() => this._handleMessages());
    }

    init() {
        this.socket.on('connect', () =>
            console.log('Teranex producer is connected')
        );

        this.socket.on('message', this.onCommand);

        this.socket.on('error', (error) => console.log('Ooops: ', error));
    }

    async _handleMessages() {
        if (!this.messages.length || this.blocked) return;

        this.blocked = true;

        const { ip, port, commands, resolve, reject } = this.messages.shift();
        const DEVICE_ID = `${ip}:${port}`;

        try {
            const device = await this._getDevice(DEVICE_ID);

            if (device.busy) return;
            device.busy = true;

            let results = [];
            for (const cmd of commands) {
                results.push(await device.command(cmd));
            }
            results = results.map((val) =>
                val.replace(/\n\n/g, '\n').replace(/ACK\n/, '')
            );

            device.busy = false;
            resolve(results);
        } catch (e) {
            this.devices[DEVICE_ID].destroy();
            this.devices[DEVICE_ID] = null;

            if (e.code === 'ECONNREFUSED') {
                reject('Device is unavailable');
            } else if (e.message === 'timeout') {
                reject('Device timeout');
            } else {
                reject('Device unknown error');
            }
        } finally {
            this.blocked = false;
        }
    }

    async _getDevice(DEVICE_ID: string): Promise<TeranexDevice> {
        if (this.devices[DEVICE_ID]) {
            return this.devices[DEVICE_ID];
        }

        try {
            const [ip, port] = DEVICE_ID.split(':');
            const device = new TeranexDevice(ip, parseInt(port));
            await device.connect();
            await device.command('ping\r\n');
            this.devices[DEVICE_ID] = device;
        } catch (e) {
            console.log('Ooops: ', e);
        }
        return this.devices[DEVICE_ID];
    }

    onMessage(data: IClientMessage) {
        const { ip, port, commands } = data;
        return new Promise((resolve, reject) => {
            const message: INodeMessage = {
                ip,
                port,
                commands,
                resolve,
                reject,
            };
            this.messages.push(message);
        });
    }

    private async onCommand(data: IClientMessage) {
        const { ip, port } = data;
        try {
            const results = await Promise.resolve(this.onMessage(data));

            this.socket.emit('data', {
                ip,
                port,
                data: results,
            } as IDeviceResponseData);
        } catch (e) {
            this.socket.emit('data', {
                ip,
                port,
                data: e,
            } as IDeviceResponseData);
        }
    }
}
