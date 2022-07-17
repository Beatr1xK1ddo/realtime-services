import {Socket} from "socket.io";
import Redis from "ioredis";

import {
    IRedisModuleNodeDataSubscribeEvent,
    IRedisModuleNodeDataUnsubscribeEvent,
    IRedisMessageType,
    isRealtimeAppEvent,
    IRedisModuleAppSubscribeEvent,
    IRedisModuleAppUnsubscribeEvent,
    IRedisAppChannelEvent,
    ESubscriptionType,
    IMonitoringSubscribeEvent,
    IMonitoringRowData,
    IMonitoringSubscribedEvent,
    IMonitoringPayloadItem,
    IQosSubscribeEvent,
    IQosDataEvent,
    IQosDataPayload,
} from "@socket/shared-types";
import {IBasicLoggerOptions, MainServiceModule} from "@socket/shared/entities";
import {redisModuleUtils} from "@socket/shared-utils";

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IBasicLoggerOptions>;
};

type IMonitoringClients = Map<number, Map<string, Map<number, Set<Socket>>>>;

type IQosClients = Map<number, Map<string, Map<number, Set<Socket>>>>;

type IRedisChannelStorage = Map<string, Map<string, Set<Socket>>>;

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: IRedisChannelStorage;
    private nodeChannelClients: IRedisChannelStorage;
    private monitoringClients: IMonitoringClients;
    private qosClients: IQosClients;
    private redisUrl: string;
    private redisChannel: Redis;
    private redisMonitoringId?: number;
    private redisQosId?: number;
    private redisMonitoring: Redis;
    private redisQos: Redis;
    private redisToKey: Redis;

    constructor(name: string, options: RedisServiceModuleOptions) {
        super(name, options);
        this.appChannelClients = new Map();
        this.nodeChannelClients = new Map();
        this.monitoringClients = new Map();
        this.qosClients = new Map();
        this.redisUrl = options.url;
        this.initRedis();
        this.log("created");
    }

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribe", this.handleSubscribe(socket));
        socket.on("unsubscribe", this.handleUnsubscribe(socket));
        socket.on("disconnect", this.handleDisconnect(socket));
    }

    // Subscribe
    private handleSubscribe = (socket: Socket) => (event: IRedisModuleAppSubscribeEvent) => {
        if ("subscriptionType" in event) {
            if (event.subscriptionType === ESubscriptionType.qos) {
                this.handleQosSubscribe(socket, event as IQosSubscribeEvent);
            } else if (event.subscriptionType === ESubscriptionType.monitoring) {
                this.handleMonitoringSubscribe(socket, event as IMonitoringSubscribeEvent);
            }
        } else {
            if (redisModuleUtils.isIRedisAppChannelEvent(event)) {
                this.handleAppStateSubscribe(socket, event);
            } else if (redisModuleUtils.isIRedisModuleNodeDataSubscribeEvent(event)) {
                this.handleNodeStateSubscribe(socket, event);
            }
        }
    };

    private async handleMonitoringSubscribe(socket: Socket, event: IMonitoringSubscribeEvent) {
        try {
            const {ip, nodeId, port, subscriptionType} = event;
            if (this.monitoringClients.get(nodeId)?.get(ip)?.get(port)?.has(socket)) {
                return this.log(
                    `client: ${socket.id} already subscribed to subscriptionType: ${subscriptionType}, node: ${nodeId}, ip: ${ip} and port: ${port}`
                );
            }
            if (this.monitoringClients.get(nodeId)?.get(ip)?.has(port)) {
                this.monitoringClients.get(nodeId).get(ip).get(port).add(socket);
            } else if (this.monitoringClients.get(nodeId)?.has(ip)) {
                this.monitoringClients
                    .get(nodeId)
                    .get(ip)
                    .set(port, new Set([socket]));
            } else if (this.monitoringClients.has(nodeId)) {
                const portMap = new Map([[port, new Set([socket])]]);
                this.monitoringClients.get(nodeId).set(ip, portMap);
            } else if (!this.monitoringClients.has(nodeId)) {
                const portMap = new Map([[port, new Set([socket])]]);
                const ipMap = new Map([[ip, portMap]]);
                this.monitoringClients.set(nodeId, ipMap);
            }
            await this.redisToKey.client("UNBLOCK", this.redisMonitoringId);
            this.sendMonitoringData(event, socket);
            this.log(`client: ${socket.id} subscription added to node: ${nodeId}, ip: ${ip} and port: ${port}`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe to monitoring handle error ${error}`, true);
        }
    }

    private handleQosSubscribe = async (socket: Socket, event: IQosSubscribeEvent) => {
        try {
            const {appType, nodeId, appId, subscriptionType} = event;
            if (this.qosClients.get(nodeId)?.get(appType)?.get(appId)?.has(socket)) {
                return this.log(
                    `client: ${socket.id} already subscribed to subscriptionType: ${subscriptionType}, node: ${nodeId}, appType: ${appType} and appId: ${appId}`
                );
            }
            if (this.qosClients.get(nodeId)?.get(appType)?.has(appId)) {
                this.qosClients.get(nodeId).get(appType).get(appId).add(socket);
            } else if (this.qosClients.get(nodeId)?.has(appType)) {
                this.qosClients
                    .get(nodeId)
                    .get(appType)
                    .set(appId, new Set([socket]));
            } else if (this.qosClients.has(nodeId)) {
                const appIdMap = new Map([[appId, new Set([socket])]]);
                this.qosClients.get(nodeId).set(appType, appIdMap);
            } else if (!this.qosClients.has(nodeId)) {
                const appIdMap = new Map([[appId, new Set([socket])]]);
                const appTypeMap = new Map([[appType, appIdMap]]);
                this.qosClients.set(nodeId, appTypeMap);
            }
            await this.redisToKey.client("UNBLOCK", this.redisQosId);
            this.sendQosData(event, socket);
            this.log(
                `client: ${socket.id} subscription added to node: ${nodeId}, appType: ${appType} and appId: ${appId}`
            );
        } catch (error) {
            this.log(`client: ${socket.id} subscribe to qos handle error ${error}`, true);
        }
    };

    private handleAppStateSubscribe = (socket: Socket, event: IRedisAppChannelEvent) => {
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

    private handleNodeStateSubscribe = (socket: Socket, event: IRedisModuleNodeDataSubscribeEvent) => {
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

    // Unsubscribe
    private handleUnsubscribe = (socket: Socket) => (event: IRedisModuleAppUnsubscribeEvent) => {
        if ("subscriptionType" in event) {
            if (event.subscriptionType === ESubscriptionType.monitoring) {
                this.handleMonitoringUnsubscribe(socket, event as IMonitoringSubscribeEvent);
            } else if (event.subscriptionType === ESubscriptionType.qos) {
                this.handleQosUnsubscribe(socket, event as IQosSubscribeEvent);
            }
        } else {
            if (redisModuleUtils.isIRedisAppChannelEvent(event)) {
                this.handleAppStateUnsubscribe(socket, event);
            } else if (redisModuleUtils.isIRedisModuleNodeDataSubscribeEvent(event)) {
                this.handleNodeStateUnsubscribe(socket, event);
            }
        }
    };

    private handleMonitoringUnsubscribe = (socket: Socket, event: IMonitoringSubscribeEvent) => {
        const {ip, nodeId, port, subscriptionType} = event;
        if (this.monitoringClients.get(nodeId).get(ip).get(port).has(socket)) {
            this.monitoringClients.get(nodeId).get(ip).get(port).delete(socket);
        } else {
            this.log(
                `client ${socket.id} unsubscribed successfuly from event: ${subscriptionType}, node: ${nodeId}, ip: ${ip} and port: ${port}`
            );
        }
    };

    private handleQosUnsubscribe = (socket: Socket, event: IQosSubscribeEvent) => {
        const {appId, nodeId, appType, subscriptionType} = event;
        if (this.qosClients.get(nodeId).get(appType).get(appId).has(socket)) {
            this.qosClients.get(nodeId).get(appType).get(appId).delete(socket);
        } else {
            this.log(
                `client ${socket.id} unsubscribed successfuly from subscriptionType: ${subscriptionType}, node: ${nodeId}, appType: ${appType} and appId: ${appId}`
            );
        }
    };

    private handleAppStateUnsubscribe = (socket: Socket, event: IRedisAppChannelEvent) => {
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

    private handleNodeStateUnsubscribe = (socket: Socket, event: IRedisModuleNodeDataUnsubscribeEvent) => {
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

    // Stream handlers
    private sendMonitoringData(event: IMonitoringSubscribeEvent, socket: Socket) {
        const {nodeId, ip, port} = event;
        const key = `${+new Date() - (60 * 1000 + 1)}-0`;
        this.redisMonitoring.xrange(`monitoring-${nodeId}`, key, "+", (err, items) => {
            if (err) {
                this.log(`error occured while getting initial values from "monitoring-${nodeId}". Error ${err}`, true);
            } else {
                const data = items?.filter((item) => {
                    const [, [key]] = item;
                    const [dataNode, dataIp, dataPort] = key.split(/[-:]/);
                    const intNodeId = parseInt(dataNode);
                    const intPort = parseInt(dataPort);
                    return intNodeId === nodeId && ip === dataIp && intPort === port;
                });
                const event: Partial<IMonitoringSubscribedEvent> = {
                    payload: [],
                };
                const result: Array<IMonitoringPayloadItem> = data.map((item, index) => {
                    const [, [key, value]] = item;
                    if (index === 0) {
                        const [dataNode, dataIp, dataPort] = key.split(/[-:]/);
                        const intNodeId = parseInt(dataNode);
                        const intPort = parseInt(dataPort);
                        event.nodeId = intNodeId;
                        event.ip = dataIp;
                        event.port = intPort;
                        event.subscriptionType = ESubscriptionType.monitoring;
                    }
                    const cleanValue = JSON.parse(value) as IMonitoringRowData;
                    return {
                        moment: cleanValue.time,
                        monitoring: {
                            bitrate: cleanValue.tsDataRate,
                            muxrate: cleanValue.tsTotalRate === cleanValue.tsDataRate ? 0 : cleanValue.tsTotalRate,
                        },
                        errors: {
                            cc: cleanValue.p1Stats.ccErrors,
                            syncLosses: cleanValue.p1Stats.syncLosses,
                        },
                    };
                });
                if (result.length) {
                    event.payload = result;
                    socket.emit("subscribed", event);
                }
                this.handleMonitoringData();
            }
        });
    }

    private handleMonitoringData() {
        const channels = Array.from(this.monitoringClients.keys()).map((node) => `monitoring-${node}`);
        const ids = channels.map(() => "$");
        this.redisMonitoring.xread("COUNT", 1, "BLOCK", 0, "STREAMS", ...channels, ...ids, (err, res) => {
            if (err) {
                this.log(`error occured while handle new value in handleMonitoringData event. Error ${err}`, true);
            } else {
                if (res) {
                    const [nodeID, ip, port] = res[0][1][0][1][0].split(/[-:]/);
                    const intPort = parseInt(port);
                    const intNodeId = parseInt(nodeID);
                    const data = JSON.parse(res[0][1][0][1][1]) as IMonitoringRowData;
                    this.monitoringClients
                        .get(intNodeId)
                        ?.get(ip)
                        ?.get(intPort)
                        ?.forEach((socket) =>
                            socket.emit("realtimeMonitoring", {
                                nodeId: intNodeId,
                                ip,
                                port: intPort,
                                subscriptionType: ESubscriptionType.monitoring,
                                payload: {
                                    moment: data.time,
                                    monitoring: {
                                        bitrate: data.tsDataRate,
                                        muxrate: data.tsTotalRate === data.tsDataRate ? 0 : data.tsTotalRate,
                                    },
                                    errors: {
                                        cc: data.p1Stats.ccErrors,
                                        syncLosses: data.p1Stats.syncLosses,
                                    },
                                },
                            })
                        );
                    if (this.monitoringClients.get(intNodeId)) {
                        setTimeout(() => this.handleMonitoringData(), 0);
                    }
                }
            }
        });
    }

    private sendQosData(event: IQosSubscribeEvent, socket: Socket) {
        const {nodeId, appType, appId} = event;
        const key = `${+new Date() - (60 * 1000 + 1)}-0`;
        this.redisQos.xrange(`qos-${nodeId}`, key, "+", (err, items) => {
            if (err) {
                this.log(`error occured while getting initial values from "qos-${nodeId}". Error ${err}`, true);
            } else {
                const data = items?.filter((item) => {
                    const [, [key]] = item;
                    const [dataNode, dataAppType, dataAppId] = key.split(/[-:]/);
                    const intNodeId = parseInt(dataNode);
                    const intAppId = parseInt(dataAppId);
                    return intNodeId === nodeId && dataAppType === appType && intAppId === appId;
                });
                const clientEvent: Partial<IQosDataEvent> = {...event};
                if (data.length) {
                    const result = data[data.length - 1];
                    const [, [, value]] = result;
                    const cleanValue = JSON.parse(value) as IQosDataPayload;
                    clientEvent.payload = cleanValue;
                    socket.emit("subscribed", clientEvent);
                }
                this.handleQosData();
            }
        });
    }

    private handleQosData() {
        const channels = Array.from(this.qosClients.keys()).map((node) => `qos-${node}`);
        const ids = channels.map(() => "$");
        this.redisQos.xread("COUNT", 1, "BLOCK", 0, "STREAMS", ...channels, ...ids, (err, res) => {
            if (err) {
                this.log(`error occured while handle new value in handleQosData event. Error ${err}`, true);
            } else {
                if (res) {
                    const [nodeID, appType, appId] = res[0][1][0][1][0].split(/[-:]/);
                    const intAppId = parseInt(appId);
                    const intNodeId = parseInt(nodeID);
                    const data = JSON.parse(res[0][1][0][1][1]) as IQosDataPayload;
                    this.qosClients
                        .get(intNodeId)
                        ?.get(appType)
                        ?.get(intAppId)
                        ?.forEach((socket) =>
                            socket.emit("realtimeQos", {
                                nodeId: intNodeId,
                                appType,
                                appId: intAppId,
                                subscriptionType: ESubscriptionType.qos,
                                payload: data,
                            })
                        );
                    if (this.qosClients.get(intNodeId)) {
                        setTimeout(() => this.handleQosData(), 0);
                    }
                }
            }
        });
    }

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
        this.monitoringClients.forEach((_, nodeId) =>
            _.forEach((__) =>
                __.forEach((sockets) => {
                    if (sockets.has(socket)) {
                        sockets.delete(socket);
                        this.log(`client: ${socket.id} disconnected`);
                        let emptyNode = true;
                        this.monitoringClients.get(nodeId).forEach((portMap) =>
                            portMap.forEach((sockets) => {
                                if (sockets.size) emptyNode = false;
                            })
                        );
                        if (emptyNode) {
                            this.log(`stream: 'monitoring-${nodeId}' is empty. Removing this stream`);
                            this.monitoringClients.delete(nodeId);
                        }
                    }
                })
            )
        );
    };

    private async initRedis() {
        try {
            this.redisToKey = new Redis(this.redisUrl);
            this.redisChannel = new Redis(this.redisUrl);
            this.redisMonitoring = new Redis(this.redisUrl);
            this.redisQos = new Redis(this.redisUrl);
            this.redisMonitoringId = await this.redisMonitoring.client("ID");
            this.redisQosId = await this.redisQos.client("ID");
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
            this.log(`redis channel: ${redisChannel} event handling error ${error}`, true);
        }
    };
}
