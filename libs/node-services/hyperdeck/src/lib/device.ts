import { Socket } from 'net';
import { IDeviceResponse } from '@socket/shared-types';

export class HyperdeckDevice {
    private timeout = 2000;
    private ip: string;
    private port: number;
    private response?: Omit<IDeviceResponse, 'data'>;
    private socket?: Socket;
    public busy = false;

    constructor(ip: string, port: number) {
        this.ip = ip;
        this.port = port;
    }

    connect() {
        this.socket = new Socket();
        this.socket.setEncoding('utf8');
        this.socket.setTimeout(this.timeout);

        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
            };

            this.socket?.connect({ host: this.ip, port: this.port }, () => {
                console.log('Teranex device connected: ', this.ip, this.port);
                resolve(true);
            });

            this.socket?.on('data', (data) =>
                this.response?.resolve(data.toString())
            );

            this.socket?.on('error', (err) => {
                console.log('Teranex device error: ', this.ip, this.port, err);
                reject(err);
            });

            this.socket?.on('timeout', () => {
                console.log(
                    'Teranex device error: ',
                    this.ip,
                    this.port,
                    'timeout'
                );
                reject(Error('timeout'));
            });
        });
    }

    command(cmd: string) {
        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
            };
            console.log('Teranex device command: ', this.ip, this.port, cmd);
            this.socket?.write(cmd, (error) => {
                if (error) {
                    console.log(
                        'Teranex device socket write error: ',
                        this.ip,
                        this.port,
                        error
                    );
                    reject(error);
                }
            });
        });
    }
}
