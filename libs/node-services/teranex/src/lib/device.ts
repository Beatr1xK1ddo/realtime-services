import { Socket } from 'net';
import { IDeviceResponse, IPinoOptions } from '@socket/shared-types';
import { PinoLogger } from '@socket/shared-utils';

export class TeranexDevice {
    private timeout = 2000;
    private ip: string;
    private port: number;
    private response: IDeviceResponse;
    private socket?: Socket;
    public busy = false;
    private logger: PinoLogger;

    constructor(
        ip: string,
        port: number,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        this.ip = ip;
        this.port = port;
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
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

            this.socket.connect({ host: this.ip, port: this.port }, () => {
                this.logger.log.info(
                    'Teranex device connected: ',
                    this.ip,
                    this.port
                );
                resolve(true);
            });

            this.socket.on('data', (data) => {
                this.logger.log.info(
                    'Teranex device data: ',
                    this.ip,
                    this.port,
                    data
                );
                this.response.data += data.toString();
            });

            this.socket.on('error', (err) => {
                this.logger.log.error(
                    'Teranex device error: ',
                    this.ip,
                    this.port,
                    err
                );
                reject(err);
            });

            this.socket.on('timeout', () => {
                this.logger.log.error(
                    'Teranex device error: ',
                    this.ip,
                    this.port,
                    'timeout'
                );
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
            this.logger.log.info(
                'Teranex device command: ',
                this.ip,
                this.port,
                cmd
            );
            this.socket.write(cmd, (error) => {
                if (error) {
                    this.logger.log.error(
                        'Teranex device error while execute cmd: ',
                        this.ip,
                        this.port,
                        error
                    );
                    reject(error);
                }
            });
            setTimeout(() => resolve(this.response.data), timeout * 1000);
        });
    }

    destroy() {
        this.socket?.end();
        this.logger.log.info('Teranex device destroyed: ', this.ip, this.port);
    }
}
