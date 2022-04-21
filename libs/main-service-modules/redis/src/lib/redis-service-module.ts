import {
    IMainServiceModule,
    IPinoOptions,
    IRealtimeAppEvent,
    IRedisClientEvent,
} from '@socket/shared-types';
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
    private clients: Map<string, Map<number, Set<Socket>>>;

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
        this.clients = new Map();
    }

    init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
            this.redis.on('message', this.handleMessage.bind(this));
        } catch (e) {
            this.logger.log.error('Error inside RedisServiceModule.init :', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on('subscribe', (event: IRedisClientEvent) => {
            const { id, type, nodeId } = event;
            const channel = `realtime:app:${nodeId}:${type}`;
            const channelAppIdsMap = this.clients.get(channel);

            if (!channelAppIdsMap) {
                const channelMap = new Map<number, Set<Socket>>();
                this.clients.set(channel, channelMap);
            }

            if (!channelAppIdsMap.has(id)) {
                channelAppIdsMap.set(id, new Set<Socket>());
            }

            if (!channelAppIdsMap.get(id).has(socket)) {
                channelAppIdsMap.get(id).add(socket);
                this.redis.subscribe(channel, (error, count) => {
                    if (error) {
                        this.log(
                            `Error while subscribe to redis ${error.name}`,
                            true
                        );
                    } else {
                        this.log(
                            `Subscribe to redis channel: ${channel} success`
                        );
                        this.log(`The channel has: ${count} subscribers`);
                    }
                });
            }
        });

        socket.on('unsubscribe', (event: IRedisClientEvent) => {
            const { id, type, nodeId } = event;
            const channel = `realtime:app:${nodeId}:${type}`;

            if (this.clients.get(channel)?.get(id)?.has(socket)) {
                this.clients.get(channel).get(id).delete(socket);
                this.log(
                    `Unsubscribe socket ${socket.id} from "${nodeId}/${type}/${id}`
                );
            }
        });
    }

    private async handleMessage(channel: string, event: IRealtimeAppEvent) {
        const { id } = event;
        const eventClients = this.clients.get(channel)?.get(id);

        if (!eventClients) {
            return;
        }
        eventClients.forEach((socket) => socket.emit('response', event));
    }

    private log(message: string, error?: boolean) {
        if (error) {
            this.logger.log.error(message);
        } else {
            this.logger.log.info(message);
        }
    }
}
