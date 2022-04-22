import {
    IMainServiceModule,
    IPinoOptions,
    IRedisClientEvent,
} from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import Redis from 'ioredis';
import { PinoLogger } from '@socket/shared-utils';

export class RedisServiceModule implements IMainServiceModule {
    public name: string;
    private reddisUrl: string;
    private io?: Namespace;
    private reddis: Redis;
    private logger: PinoLogger;
    private clients: Map<string, Map<string, Set<Socket>>>;

    constructor(
        name: string,
        urlRedis: string,
        loggerOptions?: Partial<IPinoOptions>
    ) {
        this.name = name;

        this.clients = new Map();

        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );

        this.reddisUrl = urlRedis;

        this.initialReddis();
    }

    private initialReddis() {
        this.reddis = new Redis(this.reddisUrl);

        this.reddis.on('error', (error) => {
            this.log('Error while connecting to Redis', true);
            this.log(error);
        });

        this.reddis.on('message', this.handleMessage.bind(this));

        this.reddis.on('connect', () => {
            this.log('Reddis was connected successfuly');
        });
    }

    public init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        } catch (e) {
            this.logger.log.error('Error inside RedisServiceModule.init :', e);
        }
    }

    private handleConnection(socket: Socket) {
        this.log('Socket was connected');
        socket.on('subscribe', (event: IRedisClientEvent) => {
            console.log('this is event', event);
            const { id, nodeId } = event;
            const channel = `realtime:app:${nodeId}:ipbe`;

            if (!this.clients.get(channel)) {
                const channelMap = new Map<string, Set<Socket>>();
                this.clients.set(channel, channelMap);

                this.reddis.subscribe(channel, (error, count) => {
                    if (error) {
                        this.log(
                            `Error while subscribe to reddis ${error.name}`,
                            true
                        );
                    } else {
                        this.log(
                            `Subscribe to reddis channel: ${channel} success`
                        );
                        this.log(`The channel has: ${count} subscribers`);
                        console.log(this.clients);
                    }
                });
            }

            if (!this.clients.get(channel).has(id)) {
                this.clients.get(channel).set(id, new Set<Socket>());
            }

            if (!this.clients.get(channel).get(id).has(socket)) {
                this.clients.get(channel).get(id).add(socket);
            }
        });

        socket.on('unsubscribe', (event: IRedisClientEvent) => {
            const { id, nodeId } = event;
            const channel = `realtime:app:${nodeId}:ipbe`;
            if (this.clients.get(channel)?.get(id)?.has(socket)) {
                this.clients.get(channel).get(id).delete(socket);
                this.log(`Unsubscribe socket ${socket.id} from "${channel}`);
            }
        });
    }

    private handleMessage(channel: string, event) {
        const cleanEvent = JSON.parse(event);
        console.log('channel', channel);
        console.log('event', event);
        const { id } = cleanEvent;
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
