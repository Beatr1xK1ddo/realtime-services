import { IModule } from '@socket/interfaces';
import { Namespace, Socket } from 'socket.io';
import { EMessageActions } from './types';
import Redis from 'ioredis';
import * as config from '../config.json';

export class NxtRedis implements IModule {
    public name: string;
    private io?: Namespace;
    private redis = new Redis(config.redis);

    constructor(name: string) {
        this.name = name;
    }

    init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        } catch (e) {
            console.log('Ooops, :', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on('message', (data) => {
            console.log(data);
        });
    }

    onMessage(msg: any) {
        return new Promise(async (resolve, reject) => {
            if (!msg.action || !((msg.action as string) in EMessageActions)) {
                reject('Unavailable action type');
                return;
            }

            let resp = null;

            try {
                switch (msg.action.toLowerCase()) {
                    case EMessageActions.get:
                        resp = await this.redis.mget(msg.data);
                        break;
                    case EMessageActions.set:
                        resp = await this.redis.mset(msg.data);
                        break;
                    case EMessageActions.delete:
                        const stream = this.redis.scanStream({
                            match: msg.data,
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
                            console.log('NxtRedis del was finished')
                        );

                        stream.on('error', (error) =>
                            console.log('Ooops: ', error)
                        );
                        break;
                }
            } catch (e) {
                reject('Redis connection issue');
                return;
            }

            resolve({
                success: true,
                data: resp,
            });
        });
    }
}
