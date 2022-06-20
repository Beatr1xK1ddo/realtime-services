import {Socket} from "socket.io";
import Redis from "ioredis";

import {
    IRedisModuleNodeDataSubscribeEvent,
    IRedisModuleNodeDataUnsubscribeEvent,
    IClients,
    IRedisMessageType,
    isRealtimeAppEvent,
    IRedisSubAppSubscribeEvent,
    IRedisSubAppUnsubscribeEvent,
    IRedisGetAppBitrateEvent,
    IRedisGetAppErrorEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleAppUnsubscribeEvent,
    IRedisGetAppUnsubscribeEvent,
    EMessageType,
} from "@socket/shared-types";
import {IBasicLoggerOptions, MainServiceModule} from "@socket/shared/entities";
import {redisModule} from "@socket/shared-utils";

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IBasicLoggerOptions>;
};

type IAppChannelClient = {
    value: string | null;
    timer: NodeJS.Timer | null;
    socket: Socket;
};

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: Map<string, Map<number, Set<Socket>>>;
    private nodeChannelClients: Map<string, Map<string, Set<Socket>>>;
    private appChannelBitrateClients: Map<string, IAppChannelClient>;
    private appChannelErrorClients: Map<string, IAppChannelClient>;
    private redisUrl: string;
    private redis: Redis;

    constructor(name: string, options: RedisServiceModuleOptions) {
        super(name, options);
        this.appChannelClients = new Map();
        this.nodeChannelClients = new Map();
        this.appChannelBitrateClients = new Map();
        this.appChannelErrorClients = new Map();
        this.redisUrl = options.url;
        this.initRedis();
        this.log("created");
    }

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribeApp", this.handleAppDataSubscribe(socket).bind(this));
        socket.on("subscribeNode", this.handleNodeDataSubscribe(socket).bind(this));
        socket.on("unsubscribeApp", this.handleAppUnsubscribe(socket).bind(this));
        socket.on("unsubscribeNode", this.handleNodeUnsubscribe(socket).bind(this));
        socket.on("disconnect", this.handleDisconnect(socket).bind(this));
    }
    // Subscribe
    private handleAppDataSubscribe = (socket: Socket) => (event: IRedisModuleAppSubscribeEvent) => {
        if (redisModule.isIRedisSubAppSubscribeEvent(event)) {
            this.handleRedisSubAppDataSubscribe(socket, event);
        } else if (redisModule.isIRedisGetAppErrorEvent(event)) {
            this.handleRedisGetAppErrorSubscribe(socket, event);
        } else {
            this.handleRedisGetAppBitrateSubscribe(socket, event);
        }
    };

    private handleRedisGetAppErrorSubscribe = (socket: Socket, event: IRedisGetAppErrorEvent) => {
        const {nodeId, ip, port, appId, appType} = event;
        const channel = `${nodeId}-${appType}-${appId}-${ip}:${port}`;
        const socketId = socket.id;
        if (!this.appChannelErrorClients.has(socketId)) {
            const timer = setInterval(() => {
                this.redis.get(channel, (err, result) => {
                    if (err) {
                        this.log(err.message, true);
                    } else {
                        const socket = this.appChannelBitrateClients.get(socketId);
                        if (socket.value !== result) {
                            socket.value = result;
                            this.handleRedisGetEvent(socket, EMessageType.error);
                        }
                    }
                });
            }, 5000);
            this.appChannelBitrateClients.set(socketId, {value: null, timer, socket});
        }
    };

    private handleRedisGetAppBitrateSubscribe = (socket: Socket, event: IRedisGetAppBitrateEvent) => {
        const {nodeId, ip, port} = event;
        const channel = `bitrate-wnulls-${nodeId}-${ip}:${port}`;
        const socketId = socket.id;
        if (!this.appChannelBitrateClients.has(socketId)) {
            const timer = setInterval(() => {
                this.redis.get(channel, (err, result) => {
                    if (err) {
                        this.log(err.message, true);
                    } else {
                        const socket = this.appChannelBitrateClients.get(socketId);
                        if (socket.value !== result) {
                            socket.value = result;
                            this.handleRedisGetEvent(socket, EMessageType.bitrate);
                        }
                    }
                });
            }, 5000);
            this.appChannelBitrateClients.set(socketId, {value: null, timer, socket});
        }
    };

    private handleRedisSubAppDataSubscribe = (socket: Socket, event: IRedisSubAppSubscribeEvent) => {
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
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
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
            }
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };
    // Unsubscribe
    private handleAppUnsubscribe = (socket: Socket) => (event: IRedisModuleAppUnsubscribeEvent) => {
        const subEvent = redisModule.isIRedisSubModuleAppUnsubscribeEvent(event);
        if (subEvent) {
            this.handleRedisSubAppDataUnsubscribe(socket, event);
        } else {
            const {messageType} = event;
            this.handleRedisGetAppUnsubscribe(socket, messageType);
        }
    };

    private handleRedisGetAppUnsubscribe = (socket: Socket, messageType: EMessageType) => {
        const clientsMap = messageType === "bitrate" ? this.appChannelBitrateClients : this.appChannelErrorClients;
        const socketId = socket.id;
        const socketObject = clientsMap.get(socketId);
        if (socketObject) {
            clearInterval(socketObject.timer);
            socketObject.socket.disconnect();
            clientsMap.delete(socketId);
        }
    };

    private handleRedisSubAppDataUnsubscribe = (socket: Socket, event: IRedisSubAppUnsubscribeEvent) => {
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
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
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
            }
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe handling error ${error}`);
        }
    };

    private handleDisconnect = (socket: Socket) => () => {
        this.removeSocketFromClientChannel(socket);
        this.log(`client: ${socket.id} disconnected`);
    };

    private removeSocketFromClientChannel(socket: Socket) {
        //todo kan: what if one socket was subscribed to a lot of channels? let channel should become Array<string>
        let removed = false;
        let channel: string | null = null;

        for (const clientsType of [this.nodeChannelClients, this.appChannelClients]) {
            for (const redisChannel of clientsType.keys()) {
                if (removed) break;
                const specificClients = clientsType.get(redisChannel);
                if (specificClients) {
                    specificClients.forEach((sockets: Set<Socket>) => {
                        if (sockets && sockets.has(socket)) {
                            sockets.delete(socket);
                            removed = true;
                            channel = redisChannel;
                        }
                    });
                }
            }

            if (channel) {
                let emptyChannel = true;
                const clientSocketsMap = clientsType.get(channel);
                const clientSocketsMapKeys = clientSocketsMap.keys();

                for (const key of clientSocketsMapKeys) {
                    if (clientSocketsMap.get(key as never).size) {
                        emptyChannel = false;
                        return;
                    }
                }

                if (emptyChannel) {
                    this.redis.unsubscribe(channel);
                }
            }
            if (removed) break;
        }

        if (removed) {
            return;
        }

        for (const clientsType of [this.appChannelBitrateClients, this.appChannelErrorClients]) {
            clientsType.forEach((socketObject) => {
                if (socketObject.socket === socket) {
                    clearInterval(socketObject.timer);
                    socketObject.socket.disconnect();
                    removed = true;
                    clientsType.delete(socket.id);
                }
            });
        }
    }

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

    private handleRedisGetEvent = (data: IAppChannelClient, messageType: EMessageType) => {
        if (messageType === EMessageType.bitrate) {
            data.socket.emit("realtimeAppDataBitrate", data.value);
        } else {
            data.socket.emit("realtimeAppDataError", data.value);
        }
    };

    private handleRedisSubEvent = (redisChannel: string, redisEvent: string) => {
        try {
            const event: IRedisMessageType = JSON.parse(redisEvent);
            const appEvent = isRealtimeAppEvent(event);

            if (appEvent) {
                const {id} = event;
                this.appChannelClients
                    .get(redisChannel)
                    ?.get(id)
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
