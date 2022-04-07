import { Device, IPinoOptions } from '@socket/shared-types';
import { PinoLogger, debounce } from '@socket/shared-utils';

export class TeranexDevice extends Device {
    constructor(
        ip: string,
        port: number,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        super(ip, port);

        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
        this.init();
    }

    private init() {
        const debouncer = debounce((data) => this.response.resolve(data), 1000);

        this.socket.connect({ host: this.ip, port: this.port }, () => {
            this.logger.log.info(
                `Teranex device "${this.ip}:${this.port}" connected`
            );
        });

        this.socket.on('data', (data) => {
            this.logger.log.info(
                `Teranex device "${this.ip}:${this.port}" data: `,
                data
            );
            console.log('data: ', data);
            this.response.data += data.toString();
            debouncer(this.response.data);
        });

        this.socket.on('error', (err) => {
            this.logger.log.error(
                `Teranex device "${this.ip}:${this.port}" error: `,
                err
            );
            this.response.reject(err);
            this.socket.destroy();
        });

        this.socket.on('timeout', () => {
            this.logger.log.error(
                `Teranex device "${this.ip}:${this.port}" timeout error`
            );
            this.response.reject(
                `Teranex device "${this.ip}:${this.port}" timeout error`
            );
            this.socket.destroy();
        });
    }

    public async command(cmd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // this.socket.emit('cmd', resolve);
            this.response = {
                data: '',
                resolve,
                reject,
            };

            this.socket.write(cmd, (error) => {
                if (error) {
                    this.logger.log.error(
                        `Teranex device "${this.ip}:${this.port}" error: `,
                        error
                    );
                    this.socket.destroy();
                    reject(error);
                }
            });

            // setTimeout(() => {
            //     console.log('resolved !!!!!!!!!!!!!!!!');
            //     this.response.resolve(this.response.data);
            // }, 10000);
        });
    }
}
