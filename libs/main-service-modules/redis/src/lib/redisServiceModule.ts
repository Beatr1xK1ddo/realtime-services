import {Socket} from "socket.io";
import Redis from "ioredis";

import {
    IPinoOptions, IRealtimeAppEvent, IRedisModuleAppDataSubscribeEvent, IRedisModuleNodeDataSubscribeEvent,
} from "@socket/shared-types";
import {MainServiceModule} from "@socket/shared/entities";

type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IPinoOptions>;
};

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: Map<string, Map<number, Set<Socket>>>;
    private nodeChannelClients: Map<string, Map<string, Set<Socket>>>;
    private redisUrl: string;
    private redis: Redis;

    constructor(name: string, options: RedisServiceModuleOptions) {
        super(name, options);
        this.appChannelClients = new Map();
        this.redisUrl = options.url;
        this.initRedis();
        this.log("created");
    };

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribe", this.handleAppDataSubscribe(socket));
        socket.on("unsubscribe", this.handleUnsubscribe(socket));
        socket.on("disconnect", this.handleDisconnect(socket))
    };

    private handleAppDataSubscribe = (socket: Socket) => (event: IRedisModuleAppDataSubscribeEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            // const redisChannel = `realtime:node:${nodeId}`;

            if (this.appChannelClients.has(redisChannel)) {
                if (this.appChannelClients.get(redisChannel).has(appId)) {
                    this.appChannelClients.get(redisChannel).get(appId).add(socket);
                } else {
                    const sockets = new Set<Socket>([socket]);
                    this.appChannelClients.get(redisChannel).set(appId, sockets);
                }
            } else {
                this.redis.subscribe(redisChannel, (error) => {
                    if (error) {
                        this.log(`redis channel: ${redisChannel} subscribe failure: ${error.name}`, true);
                    } else {
                        this.log(`redis channel: ${redisChannel} subscribe success`);
                    }
                });
                const sockets = new Set<Socket>([socket]);
                const applicationToSocketsMap = new Map<number, Set<Socket>>([[appId, sockets]]);
                this.appChannelClients.set(redisChannel, applicationToSocketsMap);
            }
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleUnsubscribe = (socket: Socket) => (event: IRedisModuleAppDataSubscribeEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;

            if (this.appChannelClients.get(redisChannel)?.get(appId)?.has(socket)) {
                this.appChannelClients.get(redisChannel).get(appId).delete(socket);
            }
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription removed`);
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private handleDisconnect = (socket: Socket) => () => {
        //todo: traverse through all this.appChannelClients and remove this socket
        this.log(`client: ${socket.id} disconnected`);
    };

    private initRedis(): void {
        try {
            this.redis = new Redis(this.redisUrl);
            this.redis.on("connect", this.handleRedisConnection);
            this.redis.on("error", this.handleRedisError);
            this.redis.on("message", this.handleRedisEvent);
        } catch (error) {
            this.log(`redis initializing error ${error}`);
        }
    };

    private handleRedisConnection = () => this.log("redis connection success");

    private handleRedisError = (error) => this.log(`redis error: ${error}`, true);

    private handleRedisEvent = (redisChannel: string, redisEvent) => {
        try {
            const event: IRealtimeAppEvent = JSON.parse(redisEvent);
            const {id} = event;
            this.appChannelClients
                .get(redisChannel)
                ?.get(id)
                ?.forEach((socket) => socket.emit("realtimeAppData", event));
        } catch (error) {
            this.log(`redis channel: ${redisChannel} event handling error ${error}`);
        }
    };
}
