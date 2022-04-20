import { IMainServiceModule, IPinoOptions } from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import {
    EMessageActions,
    IRedisRequest,
    IRedisResponse,
    isIRedisRequest,
} from './types';
import Redis from 'ioredis';
import { PinoLogger } from '@socket/shared-utils';

export class RedisServiceModule implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private redis: Redis;
    private logger: PinoLogger;
    private clients: Set<Socket>;

    constructor(
        name: string,
        urlRedis: string,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        this.name = name;
        this.redis = new Redis(urlRedis);
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
    }

    init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        } catch (e) {
            this.logger.log.error('Error inside RedisServiceModule.init :', e);
        }
    }

    private handleConnection(socket: Socket) {
        // sending data to clients
        socket.on('message', this.handleMessage.bind(this));
        socket.on('subscribe', () => {
            if (!this.clients.has(socket)) {
                this.log('add new subscriber');
                this.clients.add(socket);
            }
        });
        socket.on('unsubscribe', () => {
            if (this.clients.has(socket)) {
                const socketUnsubscribe = [...this.clients].find(
                    (socketSet) => socket.id === socketSet.id
                );
                this.clients.delete(socketUnsubscribe);
                this.log(`unsubscribe socket ${socket.id}`);
            }
        });
    }

    private async handleMessage(message: IRedisRequest) {
        try {
            const result = await this.onMessage(message);
            this.log('Sending data ...');

            const response: IRedisResponse = {
                data: result,
                success: true,
            };

            this.io.emit('data', response);
            this.log(`Sending response ${response}`);
        } catch (e) {
            const response: IRedisResponse = {
                error: e,
                success: false,
            };

            this.io.emit('data', response);
            this.log(`Error while send ${e}`, true);
        }
    }

    private async onMessage(message: IRedisRequest) {
        return new Promise(async (resolve, reject) => {
            if (!isIRedisRequest(message)) {
                this.log('Unavailable action type', true);
                reject('Unavailable action type');
            }

            let response = null;

            try {
                switch (message.action.toLowerCase()) {
                    case EMessageActions.get:
                        response = await this.redis.mget(message.data);
                        break;
                    case EMessageActions.set:
                        response = await this.redis.mset(message.data);
                        break;
                    case EMessageActions.delete:
                        const stream = this.redis.scanStream({
                            match: message.data,
                        });

                        stream.on('data', (keys) => {
                            if (!keys.length) {
                                return;
                            }

                            const pipeline = this.redis.pipeline();

                            keys.forEach((key) => {
                                pipeline.del(key);
                            });

                            pipeline.exec();
                        });

                        stream.on('end', () => {
                            this.log('NxtRedis del was finished');
                            resolve('NxtRedis del was finished');
                        });

                        stream.on('error', (error) => {
                            this.log(
                                `Error while EMessageActions.delete action ${error}`,
                                true
                            );
                            reject(error);
                        });
                        break;
                }
                resolve(response);
            } catch (e) {
                this.log(`Error while hendling message ${e}`, true);
                reject(e);
            }
        });
    }

    private log(message: string, error?: boolean) {
        if (error) {
            this.logger.log.error(message);
        } else {
            this.logger.log.info(message);
        }
    }

    // private sendToSubscribers(action: EMessageActions, message?: string) {
    //     const response: IRedisResponseClient = {
    //         action,
    //         data: message,
    //     };
    //     for (const socket of this.clients) {
    //         socket.emit('data');
    //     }
    // }
}
