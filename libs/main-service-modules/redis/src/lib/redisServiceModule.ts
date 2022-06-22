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

type IMonitoringData = {
    moment: number;
    bitrate: number;
    muxrate: number;
};

type IMonitoringErrorsData = {
    moment: number;
    syncLoss: number;
    syncByte: number;
    pat: number;
    cc: number;
    transport: number;
    pcrR: number;
    pcrD: number;
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
            this.subscribeToChannel(redisChannel, specificId, socket, this.appChannelClients);
            this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleNodeDataSubscribe = (socket: Socket, event: IRedisModuleNodeDataSubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                this.subscribeToChannel(redisChannel, type, socket, this.nodeChannelClients);
                this.log(`redis channel: ${redisChannel} client: ${socket.id} subscription added`);
            }
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleRedisToKeyErrorSubscribe = (socket: Socket, event: IRedisToKeyAppErrorEvent) => {
        const {nodeId, ip, port, appId, appType} = event;
        const channel = `${nodeId}-${appType}-${appId}-${ip}:${port}--last-cc-amount`;

        const cb = (result: string) => {
            const ccErrors = parseInt(result);
            const data = {
                moment: +new Date(),
                syncLoss: 0,
                syncByte: 0,
                pat: 0,
                cc: ccErrors,
                transport: 0,
                pcrR: 0,
                pcrD: 0,
            } as IMonitoringErrorsData;
            socket.emit("realtimeMonitoringErrors", JSON.stringify(data));
        };
        this.subscribeToKey(channel, socket, this.appToKeyErrorClients, cb);
    };

    private handleRedisToKeyBitrateSubscribe = (socket: Socket, event: IRedisToKeyAppBitrateEvent) => {
        const {nodeId, ip, port} = event;
        const channel = `bitrate-wnulls-${nodeId}-${ip}:${port}`;
        const cb = (result: string) => {
            const bitrate = parseInt(result);
            const data = {
                moment: +new Date(),
                bitrate,
                muxrate: 0,
            } as IMonitoringData;
            socket.emit("realtimeMonitoring", JSON.stringify(data));
        };
        this.subscribeToKey(channel, socket, this.appToKeyBitrateClients, cb);
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
            } else {
                const sockets = new Set<Socket>([socket]);
                storage.get(channel).set(subChannel, sockets);
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
        }
    };

    private subscribeToKey = (
        channel: string,
        socket: Socket,
        storage: IRedisToKeyStorage,
        cb: (result: string) => void
    ) => {
        const channelObject = storage.get(channel);
        if (channelObject) {
            if (channelObject.sockets.has(socket)) {
                this.log(`redis channel: socket ${socket.id} already exists`);
                return;
            }
            channelObject.sockets.add(socket);
            return;
        }
        const timer = setInterval(() => {
            this.redis.get(channel, (err, result) => {
                if (err) {
                    this.log(err.message, true);
                } else {
                    const channelObject = storage.get(channel);
                    if (!channelObject || channelObject.value === result) {
                        return;
                    }
                    channelObject.value = result;
                    channelObject.sockets.forEach(() => cb(result));
                }
            });
        }, 500);
        storage.set(channel, {value: null, timer, sockets: new Set([socket])});
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
            this.unsubscribeFromChannel(redisChannel, specificId, socket, this.appChannelClients);
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
            return;
        }
        const sockets = storage.get(channel).sockets;
        sockets.delete(socket);
        this.log(`redis channel: ${channel} client: ${socket.id} was unsubscribed`);
        if (!sockets.size) {
            clearInterval(storage.get(channel).timer);
            storage.delete(channel);
            this.log(`redis channel: ${channel} is empty. Unsubscribing from this key`);
        }
    };

    private handleNodeUnsubscribe = (socket: Socket, event: IRedisModuleNodeDataUnsubscribeEvent) => {
        try {
            const {type, nodeId} = event;
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                this.unsubscribeFromChannel(redisChannel, type, socket, this.nodeChannelClients);
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
                        socket.disconnect(true);
                        this.log(`redis channel: ${channel} is empty. Unsubscribing from this key`);
                    }
                    break;
                }
            }
        }
    };

    private initRedis(): void {
        try {
            this.redis = new Redis(this.redisUrl);
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
