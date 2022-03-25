import { IModule } from '@socket/interfaces';
import { Namespace, Socket } from 'socket.io';
import { TeranexDevice } from './device';
import { IDevices } from './types';

export class Teranex implements IModule {
    public name: string;
    private io?: Namespace;
    private messages = [];
    private devices: IDevices = {};
    private blocked = false;

    constructor() {
        setInterval(() => this._handleMessages());
    }

    init(io: Namespace) {
        this.io = io;
        this.io.on('connection', this.onConnection);
    }

    private onConnection(socket: Socket) {
        socket.on('message', (data) => this._onMessage(data));
    }

    async _handleMessages() {
        if (!this.messages.length || this.blocked) return;

        this.blocked = true;

        const MSG = this.messages.shift();
        const DEVICE_ID = `${MSG.data.ip}:${MSG.data.port}`;

        try {
            const device = await this._getDevice(DEVICE_ID);

            if (device.busy) return;
            device.busy = true;

            const { commands } = MSG.data;

            let results = [];
            for (const cmd of commands) {
                results.push(await device.command(cmd));
            }
            results = results.map((val) =>
                val.replace(/\n\n/g, '\n').replace(/ACK\n/, '')
            );

            device.busy = false;
            MSG.resolve(results);
        } catch (e) {
            this.devices[DEVICE_ID].destroy();
            this.devices[DEVICE_ID] = null;

            if (e.code === 'ECONNREFUSED') {
                MSG.reject('Device is unavailable');
            } else if (e.message === 'timeout') {
                MSG.reject('Device timeout');
            } else {
                MSG.reject('Device unknown error');
            }
        } finally {
            this.blocked = false;
        }
    }

    async _getDevice(DEVICE_ID): Promise<TeranexDevice> {
        if (this.devices[DEVICE_ID]) {
            return this.devices[DEVICE_ID];
        }

        try {
            const [ip, port] = DEVICE_ID.split(':');
            const device = new TeranexDevice(ip, port);
            await device.connect();
            await device.command('ping\r\n');
            this.devices[DEVICE_ID] = device;
        } catch (e) {
            console.log('Ooops: ', e);
        }
        return this.devices[DEVICE_ID];
    }

    onMessage(data: string) {
        return new Promise((resolve, reject) => {
            this.messages.push({
                data,
                resolve,
                reject,
            });
        });
    }

    async _onMessage(req) {
        const { sender, error, data, tag } = JSON.parse(req);

        if (sender === 'service_manager') {
            console.error(error);
            return;
        }

        try {
            const res = await Promise.resolve(this.onMessage(data));

            this.io.send({
                receiver: sender,
                data: res,
                tag,
            });
        } catch (e) {
            this.io.send({
                receiver: sender,
                error: e,
                tag,
            });
        }
    }
}