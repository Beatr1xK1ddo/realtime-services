import { Socket } from 'net';
import { IDeviceResponse } from '@socket/shared-types';

export class TeranexDevice {
    private timeout = 2000;
    private ip: string;
    private port: number;
    private response: IDeviceResponse;
    private socket?: Socket;
    public busy = false;

    constructor(ip: string, port: number) {
        this.ip = ip;
        this.port = port;
    }

    connect() {
        if (this.socket) {
            this.destroy();
        }

        this.socket = new Socket();
        this.socket.setEncoding('utf8');
        this.socket.setTimeout(this.timeout);

        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
                data: '',
            };

            this.socket.connect({ host: this.ip, port: this.port }, () =>
                this.response.resolve()
            );

            this.socket.on(
                'data',
                (data) => (this.response.data += data.toString())
            );

            this.socket.on('error', (err) => this.response.reject(err));

            this.socket.on('timeout', () =>
                this.response.reject(Error('timeout'))
            );
        });
    }

    command(cmd: string, timeout = 0.7) {
        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
                data: '',
            };
            this.socket.write(cmd);
            setTimeout(() => resolve(this.response.data), timeout * 1000);
        });
    }

    destroy() {
        this.socket?.end();
    }
}
