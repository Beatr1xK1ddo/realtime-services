import {Socket} from "socket.io";
import Redis from "ioredis";

import {
    IRealtimeAppEvent,
    IRedisModuleAppDataSubscribeEvent,
    IRedisModuleNodeDataSubscribeEvent,
    IRedisModuleNodeDataUnsubscribeEvent,
    IRedisModuleAppDataUnsubscribeEvent,
    RedisServiceModuleOptions,
    IClients,
} from "@socket/shared-types";
import {MainServiceModule} from "@socket/shared/entities";

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
    }

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribeApp", this.handleAppDataSubscribe(socket));
        socket.on("subscribeNode", this.handleNodeDataSubscribe(socket));
        socket.on("unsubscribeApp", this.handleAppUnsubscribe(socket));
        socket.on("unsubscribeNode", this.handleNodeUnsubscribe(socket));
        socket.on("disconnect", this.handleDisconnect(socket));
    }

    private handleAppDataSubscribe = (socket: Socket) => (event: IRedisModuleAppDataSubscribeEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;

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

    private handleNodeDataSubscribe = (socket: Socket) => (event: IRedisModuleNodeDataSubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            const redisChannel = `realtime:node:${nodeId}`;

            if (this.nodeChannelClients.has(redisChannel)) {
                if (this.nodeChannelClients.get(redisChannel).has(type)) {
                    this.nodeChannelClients.get(redisChannel).get(type).add(socket);
                } else {
                    const sockets = new Set<Socket>([socket]);
                    this.nodeChannelClients.get(redisChannel).set(type, sockets);
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
                const applicationToSocketsMap = new Map<string, Set<Socket>>([[type, sockets]]);
                this.nodeChannelClients.set(redisChannel, applicationToSocketsMap);
            }
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleAppUnsubscribe = (socket: Socket) => (event: IRedisModuleAppDataUnsubscribeEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            const clientSocketsMap = this.appChannelClients.get(redisChannel);

            if (!clientSocketsMap?.get(appId)?.has(socket)) {
                this.log(`redis channel: ${redisChannel} client: ${socket.id} can't unsubscribe`, true);
                return;
            }

            clientSocketsMap.get(appId).delete(socket);
            const clientSocketsMapKeys = clientSocketsMap.keys();
            let emptyChannel = true;

            for (const key of clientSocketsMapKeys) {
                if (clientSocketsMap.get(key).size) {
                    emptyChannel = false;
                    return;
                }
            }

            if (emptyChannel) {
                this.redis.unsubscribe(redisChannel);
            }

            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription removed`);
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private handleNodeUnsubscribe = (socket: Socket) => (event: IRedisModuleNodeDataUnsubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            const redisChannel = `realtime:node:${nodeId}`;
            const clientSocketsMap = this.nodeChannelClients.get(redisChannel);

            if (!clientSocketsMap.get(type)?.has(socket)) {
                this.log(`redis channel: ${redisChannel} client: ${socket.id} can't unsubscribe`, true);
                return;
            }

            clientSocketsMap.get(type).delete(socket);
            const clientSocketsMapKeys = clientSocketsMap.keys();
            let emptyChannel = true;

            for (const key of clientSocketsMapKeys) {
                if (clientSocketsMap.get(key).size) {
                    emptyChannel = false;
                    return;
                }
            }

            if (emptyChannel) {
                this.redis.unsubscribe(redisChannel);
            }
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription removed`);
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private handleDisconnect = (socket: Socket) => () => {
        const removedFromAppClients = this.removeSocketFromClientChannel(this.appChannelClients, socket);
        if (!removedFromAppClients) {
            this.removeSocketFromClientChannel(this.nodeChannelClients, socket);
        }
        this.log(`client: ${socket.id} disconnected`);
    };

    private removeSocketFromClientChannel(client: IClients, socket: Socket) {
        let removed = false;
        let socketRoom: string | null = null;
        const clientChannels = client.keys();

        for (const key of clientChannels) {
            client.get(key).forEach((sockets: Set<Socket>) => {
                if (sockets.has(socket)) {
                    sockets.delete(socket);
                    removed = true;
                    socketRoom = key;
                }
            });
        }

        if (socketRoom) {
            let emptyChannel = true;
            const clientSocketsMap = client.get(socketRoom);
            const clientSocketsMapKeys = clientSocketsMap.keys();

            for (const key of clientSocketsMapKeys) {
                if (clientSocketsMap.get(key as never).size) {
                    emptyChannel = false;
                    return;
                }
            }

            if (emptyChannel) {
                this.redis.unsubscribe(socketRoom);
            }
        }
        return removed;
    }

    private initRedis(): void {
        try {
            this.redis = new Redis(this.redisUrl);
            this.redis.on("connect", this.handleRedisConnection);
            this.redis.on("error", this.handleRedisError);
            this.redis.on("message", this.handleRedisEvent);
        } catch (error) {
            this.log(`redis initializing error ${error}`);
        }
    }

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
