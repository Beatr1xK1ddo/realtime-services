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

            this.socket.connect({host: this.ip, port: this.port}, () => {
                console.log("Teranex device connected: ", this.ip, this.port);
                resolve(true);
            });

            this.socket.on('data', (data) => {
                console.log("Teranex device data: ", this.ip, this.port, data);
                this.response.data += data.toString();
            });

            this.socket.on('error', (err) => {
                console.log("Teranex device error: ", this.ip, this.port, err);
                reject(err);
            });

            this.socket.on('timeout', () => {
                console.log("Teranex device error: ", this.ip, this.port, "timeout");
                reject(Error('timeout'));
            });
        });
    }

    command(cmd: string, timeout = 0.7) {
        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
                data: '',
            };
            console.log("Teranex device command: ", this.ip, this.port, cmd);
            this.socket.write(cmd, (error) => {
                if (error) {
                    console.log("Teranex device socket write error: ", this.ip, this.port, error);
                    reject(error);
                }
            });
            setTimeout(() => resolve(this.response.data), timeout * 1000);
        });
    }

    destroy() {
        this.socket?.end();
        console.log("Teranex device destroyed: ", this.ip, this.port);
    }
}
