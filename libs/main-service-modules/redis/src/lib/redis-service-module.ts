import { IMainServiceModule } from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import { EMessageActions, IRedisRequest, IRedisResponse } from './types';
import Redis from 'ioredis';
import { PinoLogger } from '@socket/shared-utils';

export class RedisServiceModule implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private redis: Redis;
    private logger = new PinoLogger();

    constructor(name: string, urlRedis: string) {
        this.name = name;
        this.redis = new Redis(urlRedis);
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
        socket.on('message', this.handleMessage.bind(this));
    }

    private async handleMessage(message: IRedisRequest) {
        try {
            const result = await this.onMessage(message);
            this.logger.log.info('Sending data');
            this.io.send({
                data: result,
                success: true,
            } as IRedisResponse);
        } catch (e) {
            this.logger.log.error(e);
            this.io.send({
                error: e,
                success: false,
            } as IRedisResponse);
        }
    }

    onMessage(message: IRedisRequest) {
        return new Promise(async (resolve, reject) => {
            if (
                !message.action ||
                !((message.action as string) in EMessageActions)
            ) {
                this.logger.log.error('Unavailable action type');
                reject(new Error('Unavailable action type'));
                return;
            }

            let resp = null;

            try {
                switch (message.action.toLowerCase()) {
                    case EMessageActions.get:
                        resp = await this.redis.mget(message.data);
                        break;
                    case EMessageActions.set:
                        resp = await this.redis.mset(message.data);
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

                        stream.on('end', () =>
                            this.logger.log.info('NxtRedis del was finished')
                        );

                        stream.on('error', (error) =>
                            this.logger.log.error(
                                'Error while EMessageActions.delete action',
                                error
                            )
                        );
                        break;
                }
            } catch (e) {
                this.logger.log.error(e);
                reject(e);
                return;
            }

            resolve(resp);
        });
    }
}
