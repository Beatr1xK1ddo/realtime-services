import {Socket} from "socket.io";
import Redis from "ioredis";

import {
    IRedisModuleNodeDataSubscribeEvent,
    IRedisModuleNodeDataUnsubscribeEvent,
    IRedisMessageType,
    isRealtimeAppEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleAppUnsubscribeEvent,
    IRedisToKeyAppErrorEvent,
    IRedisToKeyAppBitrateEvent,
    IRedisAppChannelEvent,
} from "@socket/shared-types";
import {IBasicLoggerOptions, MainServiceModule} from "@socket/shared/entities";
import {redisModuleUtils} from "@socket/shared-utils";

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IBasicLoggerOptions>;
};

type IRedisToKeyChannel = {
    value: string | null;
    timer: NodeJS.Timer;
    sockets: Set<Socket>;
};

type IRedisToKeyStorage = Map<string, IRedisToKeyChannel>;

type IRedisChannelStorage = Map<string, Map<string, Set<Socket>>>;

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: IRedisChannelStorage;
    private nodeChannelClients: IRedisChannelStorage;
    private appToKeyBitrateClients: IRedisToKeyStorage;
    private appToKeyErrorClients: IRedisToKeyStorage;
    private redisUrl: string;
    private redis: Redis;

    constructor(name: string, options: RedisServiceModuleOptions) {
        super(name, options);
        this.appChannelClients = new Map();
        this.nodeChannelClients = new Map();
        this.appToKeyBitrateClients = new Map();
        this.appToKeyErrorClients = new Map();
        this.redisUrl = options.url;
        this.initRedis();
        this.log("created");
    }

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribe", this.handleAppDataSubscribe(socket));
        socket.on("unsubscribe", this.handleAppUnsubscribe(socket));
        socket.on("disconnect", this.handleDisconnect(socket));
    }
    // Subscribe
    private handleAppDataSubscribe = (socket: Socket) => (event: IRedisModuleAppSubscribeEvent) => {
        if (redisModuleUtils.isIRedisAppChannelEvent(event)) {
            this.handleRedisAppChannelSubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisToKeyAppErrorEvent(event)) {
            this.handleRedisToKeyErrorSubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisToKeyAppBitrateEvent(event)) {
            this.handleRedisToKeyBitrateSubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisModuleNodeDataSubscribeEvent(event)) {
            this.handleNodeDataSubscribe(socket, event);
        }
    };

    private handleRedisAppChannelSubscribe = (socket: Socket, event: IRedisAppChannelEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const specificId = appId.toString();
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            this.subscribeToChannel("test", "test2", socket, this.appChannelClients);
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleNodeDataSubscribe = (socket: Socket, event: IRedisModuleNodeDataSubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            console.log("lalilali");
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                this.subscribeToChannel("test", "test2", socket, this.nodeChannelClients);
                this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
            }
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleRedisToKeyErrorSubscribe = (socket: Socket, event: IRedisToKeyAppErrorEvent) => {
        const {nodeId, ip, port, appId, appType} = event;
        const channel = `${nodeId}-${appType}-${appId}-${ip}:${port}--last-cc-amount`;
        this.subscribeToKey(channel, socket, this.appToKeyErrorClients);
    };

    private handleRedisToKeyBitrateSubscribe = (socket: Socket, event: IRedisToKeyAppBitrateEvent) => {
        const {nodeId, ip, port} = event;
        const channel = `bitrate-wnulls-${nodeId}-${ip}:${port}`;
        this.subscribeToKey(channel, socket, this.appToKeyBitrateClients);
    };

    private subscribeToChannel = (
        channel: string,
        subChannel: string,
        socket: Socket,
        storage: IRedisChannelStorage
    ) => {
        if (storage.has(channel)) {
            if (storage.get(channel).has(subChannel)) {
                storage.get(channel).get(subChannel).add(socket);
                console.log("if", storage.get(channel).get(subChannel).size);
            } else {
                const sockets = new Set<Socket>([socket]);
                storage.get(channel).set(subChannel, sockets);
                console.log("else", storage.get(channel).get(subChannel).size);
            }
        } else {
            this.redis.subscribe(channel, (error) => {
                if (error) {
                    this.log(`redis channel: ${channel} subscribe failure: ${error.name}`, true);
                } else {
                    this.log(`redis channel: ${channel} subscribe success`);
                }
            });
            const sockets = new Set<Socket>([socket]);
            const applicationToSocketsMap = new Map<string, Set<Socket>>([[subChannel, sockets]]);
            storage.set(channel, applicationToSocketsMap);
            console.log("1337", storage.get(channel).get(subChannel).size);
        }
    };

    private subscribeToKey = (channel: string, socket: Socket, storage: IRedisToKeyStorage) => {
        const channelObject = storage.get("test");
        if (channelObject) {
            if (channelObject.sockets.has(socket)) {
                this.log(`redis channel: socket ${socket.id} already exists`);
                return;
            }
            channelObject.sockets.add(socket);
            console.log("bitrate before", channelObject.sockets.size);
            return;
        }
        const timer = setInterval(() => {
            this.redis.get("test", (err, result) => {
                if (err) {
                    this.log(err.message, true);
                } else {
                    const channelObject = storage.get("test");
                    if (channelObject.value !== result) {
                        channelObject.value = result;
                        channelObject.sockets.forEach((socket) => {
                            socket.emit("realtimeMonitoring", result);
                        });
                    }
                }
            });
        }, 5000);
        storage.set("test", {value: null, timer, sockets: new Set([socket])});
        console.log("bitrate after", storage.get("test").sockets.size);
    };

    // Unsubscribe
    private handleAppUnsubscribe = (socket: Socket) => (event: IRedisModuleAppUnsubscribeEvent) => {
        if (redisModuleUtils.isIRedisAppChannelEvent(event)) {
            this.handleRedisAppChannelUnsubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisToKeyAppErrorEvent(event)) {
            this.handleRedisToKeyErrorUnsubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisToKeyAppBitrateEvent(event)) {
            this.handleRedisToKeyBitrateUnsubscribe(socket, event);
        } else if (redisModuleUtils.isIRedisModuleNodeDataSubscribeEvent(event)) {
            this.handleNodeUnsubscribe(socket, event);
        }
    };

    private handleRedisToKeyBitrateUnsubscribe = (socket: Socket, event: IRedisToKeyAppBitrateEvent) => {
        const {nodeId, ip, port} = event;
        const channel = `bitrate-wnulls-${nodeId}-${ip}:${port}`;
        this.unsubscribeFromKey(channel, socket, this.appToKeyBitrateClients);
    };

    private handleRedisToKeyErrorUnsubscribe = (socket: Socket, event: IRedisToKeyAppErrorEvent) => {
        const {nodeId, ip, port, appId, appType} = event;
        const channel = `${nodeId}-${appType}-${appId}-${ip}:${port}--last-cc-amount`;
        this.unsubscribeFromKey(channel, socket, this.appToKeyErrorClients);
    };

    private handleRedisAppChannelUnsubscribe = (socket: Socket, event: IRedisAppChannelEvent) => {
        try {
            const {appId, nodeId, appType} = event;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            const specificId = appId.toString();
            this.unsubscribeFromChannel("test", "test2", socket, this.appChannelClients);
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription removed`);
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private unsubscribeFromChannel = (
        channel: string,
        subChannel: string,
        socket: Socket,
        storage: IRedisChannelStorage
    ) => {
        const clientSocketsMap = storage.get(channel);
        if (!clientSocketsMap?.get(subChannel)?.has(socket)) {
            this.log(`redis channel: ${channel} client: ${socket.id} can't unsubscribe`, true);
            return;
        }
        clientSocketsMap.get(subChannel).delete(socket);
        const clientSocketsMapKeys = clientSocketsMap.keys();
        let emptyChannel = true;
        for (const key of clientSocketsMapKeys) {
            if (clientSocketsMap.get(key).size) {
                emptyChannel = false;
                return;
            }
        }
        if (emptyChannel) {
            this.redis.unsubscribe(channel);
        }
    };

    private unsubscribeFromKey = (channel: string, socket: Socket, storage: IRedisToKeyStorage) => {
        if (!storage.get(channel)?.sockets.has(socket)) {
            this.log(`redis channel: ${channel} client: ${socket.id} can't unsubscribe`, true);
        }
        const sockets = storage.get(channel).sockets;
        sockets.delete(socket);
        if (!sockets.size) {
            clearInterval(storage.get(channel).timer);
            storage.delete(channel);
        }
    };

    private handleNodeUnsubscribe = (socket: Socket, event: IRedisModuleNodeDataUnsubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                this.unsubscribeFromChannel("test", "test2", socket, this.nodeChannelClients);
                this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription removed`);
            }
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private handleDisconnect = (socket: Socket) => () => {
        //todo kan: what if one socket was subscribed to a lot of channels? let channel should become Array<string>
        let removed = false;
        let channel: string | null = null;
        for (const clientsSubType of [this.nodeChannelClients, this.appChannelClients]) {
            if (removed) break;
            for (const redisChannel of clientsSubType.keys()) {
                if (removed) break;
                const specificClients = clientsSubType.get(redisChannel);
                if (specificClients) {
                    specificClients.forEach((sockets: Set<Socket>) => {
                        if (sockets && sockets.has(socket)) {
                            sockets.delete(socket);
                            removed = true;
                            channel = redisChannel;
                            this.log(`client: ${socket.id} disconnected`);
                        }
                    });
                }
            }
            if (channel) {
                let emptyChannel = true;
                const clientSocketsMap = clientsSubType.get(channel);
                const clientSocketsMapKeys = clientSocketsMap.keys();

                for (const key of clientSocketsMapKeys) {
                    if (clientSocketsMap.get(key as never).size) {
                        emptyChannel = false;
                        break;
                    }
                }
                if (emptyChannel) {
                    this.log(`channel: ${channel} is empty. Removing redis subscription`);
                    this.redis.unsubscribe(channel);
                }
            }
            if (removed) break;
        }
        if (removed) {
            return;
        }
        for (const clientsToKeyType of [this.appToKeyBitrateClients, this.appToKeyErrorClients]) {
            if (removed) break;
            for (const redisChannel of clientsToKeyType.keys()) {
                if (clientsToKeyType.get(redisChannel)?.sockets?.has(socket)) {
                    const channelObject = clientsToKeyType.get(redisChannel);
                    channelObject.sockets.delete(socket);
                    removed = true;
                    channel = redisChannel;
                    this.log(`client: ${socket.id} disconnected`);

                    if (!channelObject.sockets.size) {
                        clearInterval(channelObject.timer);
                        clientsToKeyType.delete(redisChannel);
                        this.log(`channel: ${channel} is empty. Removing redis subscription`);
                    }
                    break;
                }
            }
        }
    };

    private initRedis(): void {
        try {
            this.redis = new Redis("localhost:6379");
            this.redis.on("connect", this.handleRedisConnection);
            this.redis.on("error", this.handleRedisError);
            this.redis.on("message", this.handleRedisSubEvent);
        } catch (error) {
            this.log(`redis initializing error ${error}`);
        }
    }

    private handleRedisConnection = () => this.log("redis connection success");

    private handleRedisError = (error) => this.log(`redis error: ${error}`, true);

    private handleRedisSubEvent = (redisChannel: string, redisEvent: string) => {
        try {
            const event: IRedisMessageType = JSON.parse(redisEvent);
            const appEvent = isRealtimeAppEvent(event);

            if (appEvent) {
                const {id} = event;
                this.appChannelClients
                    .get(redisChannel)
                    ?.get(id.toString())
                    ?.forEach((socket) => socket.emit("realtimeAppData", event));
            } else {
                const {type} = event;
                this.nodeChannelClients
                    .get(redisChannel)
                    ?.get(type)
                    ?.forEach((socket) => socket.emit("realtimeNodeData", event));
            }
        } catch (error) {
            this.log(`redis channel: ${redisChannel} event handling error ${error}`);
        }
    };
}
