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
    IMonitoringErrorsData,
    IMonitoringData,
} from "@socket/shared-types";
import {IBasicLoggerOptions, MainServiceModule} from "@socket/shared/entities";
import {redisModuleUtils} from "@socket/shared-utils";

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IBasicLoggerOptions>;
};

type IRedisToKeyStorage = Map<string, IRedisToKeyChannel>;

type IRedisToKeyChannel = {
    timer: NodeJS.Timer;
    sockets: Set<Socket>;
};

type IRedisChannelStorage = Map<string, Map<string, Set<Socket>>>;

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: IRedisChannelStorage;
    private nodeChannelClients: IRedisChannelStorage;
    private monitoringClients: IRedisToKeyStorage;
    private monitoringErrorClients: IRedisToKeyStorage;
    private redisUrl: string;
    private redisChannel: Redis;
    private redisToKey: Redis;

    constructor(name: string, options: RedisServiceModuleOptions) {
        super(name, options);
        this.appChannelClients = new Map();
        this.nodeChannelClients = new Map();
        this.monitoringClients = new Map();
        this.monitoringErrorClients = new Map();
        this.redisUrl = options.url;
        this.initRedis();
        this.redisToKey = new Redis(this.redisUrl);
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

        if (this.monitoringErrorClients.get(channel)) {
            if (this.monitoringErrorClients.get(channel).sockets.has(socket)) {
                this.log(`client ${socket.id} already subscribed to key: ${channel}`);
            } else {
                this.monitoringErrorClients.get(channel).sockets.add(socket);
                this.log(`client ${socket.id} subscribed to key: ${channel}`);
            }
        } else {
            const sockets = new Set([socket]);
            const dataHandler = (result: string) => {
                const ccErrors = parseInt(result);
                const data: IMonitoringErrorsData = {
                    channel: {
                        nodeId,
                        ip,
                        port,
                        appId,
                        appType,
                    },
                    moment: +new Date(),
                    syncLoss: 0,
                    syncByte: 0,
                    pat: 0,
                    cc: ccErrors,
                    transport: 0,
                    pcrR: 0,
                    pcrD: 0,
                };
                socket.emit("realtimeMonitoringErrors", JSON.stringify(data));
            };
            const timer = this.subscribeToKey(channel, dataHandler, true);
            const channelHolder = {
                timer,
                sockets,
            };
            this.monitoringClients.set(channel, channelHolder);
            this.log(`client ${socket.id} subscribed to key: ${channel}`);
        }
    };

    private handleRedisToKeyBitrateSubscribe = (socket: Socket, event: IRedisToKeyAppBitrateEvent) => {
        const {nodeId, ip, port} = event;
        const channel = `bitrate-wnulls-${nodeId}-${ip}:${port}`;
        if (this.monitoringClients.get(channel)) {
            if (this.monitoringClients.get(channel).sockets.has(socket)) {
                this.log(`client ${socket.id} already subscribed to key: ${channel}`);
            } else {
                this.monitoringClients.get(channel).sockets.add(socket);
                this.log(`client ${socket.id} subscribed to key: ${channel}`);
            }
        } else {
            const sockets = new Set([socket]);
            const dataHandler = (result: string) => {
                const bitrate = parseInt(result);

                const data: IMonitoringData = {
                    channel: {
                        nodeId,
                        ip,
                        port,
                    },
                    moment: +new Date(),
                    bitrate: bitrate || 0,
                    muxrate: 0,
                };

                sockets.forEach((socket) => {
                    socket.emit("realtimeMonitoring", JSON.stringify(data));
                });
            };
            const timer = this.subscribeToKey(channel, dataHandler);
            const channelHolder = {
                timer,
                sockets,
            };
            this.monitoringClients.set(channel, channelHolder);
            this.log(`client ${socket.id} subscribed to key: ${channel}`);
        }
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
            this.redisChannel.subscribe(channel, (error) => {
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

    private subscribeToKey = (channel: string, onData: (data: string) => void, memoized?: boolean) => {
        let data = null;
        const timer = setInterval(() => {
            this.redisToKey.get(channel, (err, result) => {
                if (err) {
                    this.log(err.message, true);
                } else {
                    if (memoized) {
                        if (data !== result) {
                            data = result;
                            onData(result);
                        }
                    } else {
                        onData(result);
                    }
                }
            });
        }, 1000);
        return timer;
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
        this.unsubscribeFromKey(channel, socket, this.monitoringClients);
    };

    private handleRedisToKeyErrorUnsubscribe = (socket: Socket, event: IRedisToKeyAppErrorEvent) => {
        const {nodeId, ip, port, appId, appType} = event;
        const channel = `${nodeId}-${appType}-${appId}-${ip}:${port}--last-cc-amount`;
        this.unsubscribeFromKey(channel, socket, this.monitoringErrorClients);
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
            this.redisChannel.unsubscribe(channel);
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
                    this.redisChannel.unsubscribe(channel);
                }
            }
            if (removed) break;
        }
        if (removed) {
            return;
        }
        for (const clientsToKeyType of [this.monitoringClients, this.monitoringErrorClients]) {
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
            this.redisChannel = new Redis(this.redisUrl);
            this.redisChannel.on("connect", this.handleRedisConnection);
            this.redisChannel.on("error", this.handleRedisError);
            this.redisChannel.on("message", this.handleRedisSubEvent);
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
