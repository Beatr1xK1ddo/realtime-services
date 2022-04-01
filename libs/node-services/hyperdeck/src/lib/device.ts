import { Socket } from 'net';
import { IDeviceResponse } from '@socket/shared-types';
import { PinoLogger } from '@socket/shared-utils';

export class HyperdeckDevice {
    private timeout = 2000;
    private ip: string;
    private port: number;
    private response?: Omit<IDeviceResponse, 'data'>;
    private socket?: Socket;
    public busy = false;
    private logger = new PinoLogger();

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
                this.logger.log.info(
                    'Hyperdeck device connected: ',
                    this.ip,
                    this.port
                );
                resolve(true);
            });

            this.socket?.on('data', (data) =>
                this.response?.resolve(data.toString())
            );

            this.socket?.on('error', (err) => {
                this.logger.log.error(
                    'Hyperdeck device error: ',
                    this.ip,
                    this.port,
                    err
                );
                reject(err);
            });

            this.socket?.on('timeout', () => {
                this.logger.log.error(
                    'Hyperdeck device error: ',
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
            this.logger.log.info(
                'Hyperdeck device command: ',
                this.ip,
                this.port,
                cmd
            );
            this.socket?.write(cmd, (error) => {
                if (error) {
                    this.logger.log.error(
                        'Hyperdeck device socket write error: ',
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
