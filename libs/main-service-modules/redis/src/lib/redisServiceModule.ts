import {Socket} from "socket.io";
import Redis from "ioredis";
import {
    ESubscriptionType,
    IAppData,
    IAppDataSubscribedEvent,
    IAppIdAppTypeOrigin,
    IDataEvent,
    IIpPortOrigin,
    IMonitoringData,
    IMonitoringRowData,
    INodeData,
    INodeSubscribeOrigin,
    IOnDataHandler,
    IPubSubData,
    IQosData,
    ISubscribedEvent,
    ISubscribeEvent,
    IUnsubscribeEvent,
} from "@socket/shared-types";
import {IBasicLoggerOptions, MainServiceModule} from "@socket/shared/entities";
import {redisModuleUtils} from "@socket/shared-utils";

export type RedisServiceModuleOptions = {
    url: string;
    logger?: Partial<IBasicLoggerOptions>;
};

type IMonitoringClients = Map<number, Map<string, Map<number, Set<Socket>>>>;

type IQosClients = Map<number, Map<string, Map<number, Set<Socket>>>>;

type IAppChannelStorage = Map<string, Map<number, Set<Socket>>>;

type INodeChannelStorage = Map<string, Map<string, Set<Socket>>>;

export class RedisServiceModule extends MainServiceModule {
    private appChannelClients: IAppChannelStorage;
    private nodeChannelClients: INodeChannelStorage;
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
    }

    protected onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribe", this.handleSubscribe(socket));
        socket.on("unsubscribe", this.handleUnsubscribe(socket));
        socket.on("disconnect", this.handleDisconnect(socket));
    }

    // Subscribe
    private handleSubscribe = (socket: Socket) => (event: ISubscribeEvent) => {
        const {subscriptionType} = event;
        if (subscriptionType === ESubscriptionType.qos) {
            this.handleQosSubscribe(socket, event);
        } else if (subscriptionType === ESubscriptionType.monitoring) {
            this.handleMonitoringSubscribe(socket, event);
        }
        if (subscriptionType === ESubscriptionType.node) {
            this.handleNodeStateSubscribe(socket, event);
        } else if (subscriptionType === ESubscriptionType.app) {
            this.handleAppStateSubscribe(socket, event);
        }
    };

    private async handleMonitoringSubscribe(socket: Socket, event: ISubscribeEvent<IIpPortOrigin>) {
        try {
            const {origin, subscriptionType} = event;
            const {ip, nodeId, port} = origin;
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
                await this.redisToKey.client("UNBLOCK", this.redisMonitoringId);
                this.handleMonitoringData();
            }
            const data = await this.getMonitoringData(event);
            if (data.payload.length) {
                socket.emit("subscribed", data);
            }
            this.log(`client: ${socket.id} subscribed to Monitoring. Node: ${nodeId}, ip: ${ip} and port: ${port}`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe to Monitoring handle error ${error}`, true);
        }
    }

    private handleQosSubscribe = async (socket: Socket, event: ISubscribeEvent<IAppIdAppTypeOrigin>) => {
        try {
            const {origin, subscriptionType} = event;
            const {appType, nodeId, appId} = origin;
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
                await this.redisToKey.client("UNBLOCK", this.redisQosId);
                this.handleQosData();
            }
            const data = await this.getQosData(event);
            if ((data.payload as IQosData).items?.length) {
                socket.emit("subscribed", data);
            }
            this.log(`client: ${socket.id} subscibed to Qos. Node: ${nodeId}, appType: ${appType} and appId: ${appId}`);
        } catch (error) {
            this.log(`client: ${socket.id} subscribe to Qos handle error ${error}`, true);
        }
    };

    private handleAppStateSubscribe = async (socket: Socket, event: ISubscribeEvent<IAppIdAppTypeOrigin>) => {
        try {
            const {origin, subscriptionType} = event;
            const {appId, nodeId, appType} = origin;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            const status = await this.redisGet(`${appType}-${appId}-status`);
            const statusChange = await this.redisGet(`${appType}-${appId}-statusChange`);
            // todo: i am not sure that this is correct way of getting initial runtime
            const startedAt = await this.redisGet(`${appType}-${appId}-started_at`);
            const subscribeEvent: ISubscribedEvent<IAppIdAppTypeOrigin, IAppDataSubscribedEvent> = {
                subscriptionType,
                origin: {
                    appId,
                    appType,
                    nodeId,
                },
                payload: {
                    status: {
                        status,
                        statusChange,
                    },
                    runtime: {
                        startedAt: parseInt(startedAt),
                    },
                },
            };
            socket.emit("subscribed", subscribeEvent);
            if (this.appChannelClients.get(redisChannel)?.get(appId)?.has(socket)) {
                this.log(`client ${socket.id} already subscribed to channel ${redisChannel}`, true);
                return;
            } else if (this.appChannelClients.get(redisChannel)?.has(appId)) {
                this.appChannelClients.get(redisChannel).get(appId).add(socket);
            } else if (this.appChannelClients.has(redisChannel)) {
                this.appChannelClients.get(redisChannel).set(appId, new Set<Socket>([socket]));
            } else if (!this.appChannelClients.has(redisChannel)) {
                const sockets = new Map([[appId, new Set<Socket>([socket])]]);
                this.appChannelClients.set(redisChannel, sockets);
                this.redisSubscribeToChannel(redisChannel);
            }
            this.log(
                `client: ${socket.id} subscription added to AppState redis channel: ${redisChannel}, appId: ${appId}`
            );
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    private handleNodeStateSubscribe = (socket: Socket, event: ISubscribeEvent<INodeSubscribeOrigin>) => {
        try {
            const {origin} = event;
            const {type, nodeId} = origin;
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                if (this.nodeChannelClients.get(redisChannel)?.get(type)?.has(socket)) {
                    this.log(`client ${socket.id} already subscribed to channel ${redisChannel}`, true);
                    return;
                } else if (this.nodeChannelClients.get(redisChannel)?.has(type)) {
                    this.nodeChannelClients.get(redisChannel).get(type).add(socket);
                } else if (this.nodeChannelClients.has(redisChannel)) {
                    this.nodeChannelClients.get(redisChannel).set(type, new Set<Socket>([socket]));
                } else if (!this.nodeChannelClients.has(redisChannel)) {
                    const sockets = new Map([[type, new Set<Socket>([socket])]]);
                    this.nodeChannelClients.set(redisChannel, sockets);
                    this.redisSubscribeToChannel(redisChannel);
                }
                this.log(`client: ${socket.id} subscription added to NodeState redis channel: ${redisChannel}`);
            }
        } catch (error) {
            this.log(`client: ${socket.id} subscribe handling error ${error}`);
        }
    };

    // Unsubscribe
    private handleUnsubscribe = (socket: Socket) => (event: IUnsubscribeEvent) => {
        const {subscriptionType} = event;
        if (subscriptionType === ESubscriptionType.qos) {
            this.handleQosUnsubscribe(socket, event);
        } else if (subscriptionType === ESubscriptionType.monitoring) {
            this.handleMonitoringUnsubscribe(socket, event);
        }
        if (subscriptionType === ESubscriptionType.node) {
            this.handleNodeStateUnsubscribe(socket, event);
        } else if (subscriptionType === ESubscriptionType.app) {
            this.handleAppStateUnsubscribe(socket, event);
        }
    };

    private handleMonitoringUnsubscribe = (socket: Socket, event: IUnsubscribeEvent<IIpPortOrigin>) => {
        const {origin, subscriptionType} = event;
        const {ip, nodeId, port} = origin;
        if (this.monitoringClients.get(nodeId)?.get(ip)?.get(port)?.has(socket)) {
            this.monitoringClients.get(nodeId).get(ip).get(port).delete(socket);
            this.log(
                `client ${socket.id} unsubscribed successfuly from event: ${subscriptionType}, node: ${nodeId}, ip: ${ip} and port: ${port}`
            );
        }
    };

    private handleQosUnsubscribe = (socket: Socket, event: IUnsubscribeEvent<IAppIdAppTypeOrigin>) => {
        const {origin, subscriptionType} = event;
        const {appId, nodeId, appType} = origin;
        if (this.qosClients.get(nodeId)?.get(appType)?.get(appId)?.has(socket)) {
            this.qosClients.get(nodeId).get(appType).get(appId).delete(socket);
            this.log(
                `client ${socket.id} unsubscribed successfuly from subscriptionType: ${subscriptionType}, node: ${nodeId}, appType: ${appType} and appId: ${appId}`
            );
        }
    };

    private handleAppStateUnsubscribe = (socket: Socket, event: IUnsubscribeEvent<IAppIdAppTypeOrigin>) => {
        try {
            const {origin} = event;
            const {appId, nodeId, appType} = origin;
            const redisChannel = `realtime:app:${nodeId}:${appType}`;
            if (!this.appChannelClients?.get(redisChannel)?.get(appId)?.has(socket)) {
                this.log(`client: ${socket.id} can't unsubscribe from AppSatate redis channel: ${redisChannel}`, true);
                return;
            } else {
                const channelClients = this.appChannelClients.get(redisChannel);
                channelClients.get(appId).delete(socket);
                let empty = true;
                for (const key of channelClients.keys()) {
                    if (channelClients.get(key as never)?.size) {
                        empty = false;
                        break;
                    }
                }
                if (empty) {
                    this.redisUnsubscribeFromChannel(redisChannel);
                }
                this.log(`client: ${socket.id} subscription removed from AppSatate redis channel: ${redisChannel}`);
            }
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe from AppSatate handle error ${error}`, true);
        }
    };

    private handleNodeStateUnsubscribe = (socket: Socket, event: IUnsubscribeEvent<INodeSubscribeOrigin>) => {
        try {
            const {origin} = event;
            const {type, nodeId} = origin;
            const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId];
            for (let index = 0; index < nodeIds.length; index++) {
                const redisChannel = `realtime:node:${nodeIds[index]}`;
                if (!this.nodeChannelClients?.get(redisChannel)?.get(type)?.has(socket)) {
                    this.log(
                        `client: ${socket.id} can't unsubscribe from NodeSatate redis channel: ${redisChannel}`,
                        true
                    );
                    return;
                } else {
                    const channelClients = this.nodeChannelClients.get(redisChannel);
                    channelClients.get(type).delete(socket);
                    let empty = true;
                    for (const key of channelClients.keys()) {
                        if (channelClients.get(key as never)?.size) {
                            empty = false;
                            break;
                        }
                    }
                    if (empty) {
                        this.redisUnsubscribeFromChannel(redisChannel);
                    }
                    this.log(
                        `client: ${socket.id} subscription removed from NodeSatate redis channel: ${redisChannel}`
                    );
                }
            }
        } catch (error) {
            this.log(`client: ${socket.id} unsubscribe from NodeSatate handle error ${error}`, true);
        }
    };

    // Stream handlers
    private async getMonitoringData(event: ISubscribeEvent<IIpPortOrigin>) {
        const {origin} = event;
        const {nodeId, ip, port} = origin;
        const key = `${+new Date() - (60 * 1000 + 1)}-0`;
        const redis = new Redis(this.redisUrl);
        const items = await redis.xrange(`monitoring-${nodeId}`, key, "+");
        const data = items?.filter((item) => {
            const [, [key]] = item;
            const [dataNode, dataIp, dataPort] = key.split(/[-:]/);
            const intNodeId = parseInt(dataNode);
            const intPort = parseInt(dataPort);
            return intNodeId === nodeId && ip === dataIp && intPort === port;
        });
        const clientEvent: ISubscribedEvent<IIpPortOrigin, Array<IMonitoringData>> = {
            ...event,
            payload: [],
        };
        const result: Array<IMonitoringData> = data.map((item) => {
            const [, [, value]] = item;
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
        clientEvent.payload = result;
        return clientEvent;
    }

    private handleMonitoringData() {
        const streams = Array.from(this.monitoringClients.keys()).map((node) => `monitoring-${node}`);
        const ids = streams.map(() => "$");
        this.redisMonitoring.xread("COUNT", 1, "BLOCK", 0, "STREAMS", ...streams, ...ids, (err, res) => {
            if (err) {
                this.log(`error occured while handle new value in handleMonitoringData event. Error ${err}`, true);
            } else {
                if (res) {
                    const [nodeIdRaw, ip, portRaw] = res[0][1][0][1][0].split(/[-:]/);
                    const port = parseInt(portRaw);
                    const nodeId = parseInt(nodeIdRaw);
                    // todo: what if nodeId, ip, port is None
                    try {
                        const data = JSON.parse(res[0][1][0][1][1]) as IMonitoringRowData;
                        this.monitoringClients
                            .get(nodeId)
                            ?.get(ip)
                            ?.get(port)
                            ?.forEach((socket) =>
                                socket.emit("data", {
                                    origin: {
                                        nodeId,
                                        ip,
                                        port,
                                    },
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
                        if (this.monitoringClients.size) {
                            setTimeout(() => this.handleMonitoringData(), 0);
                        }
                    } catch (e) {
                        this.log(`Error occured while sending new monitoring data. Error ${e}`, true);
                    }
                }
            }
        });
    }

    private async getQosData(event: ISubscribeEvent<IAppIdAppTypeOrigin>) {
        const {origin} = event;
        const {nodeId, appType, appId} = origin;
        const key = `${+new Date() - (60 * 1000 + 1)}-0`;
        const redis = new Redis(this.redisUrl);
        const items = await redis.xrange(`qos-${nodeId}`, key, "+");
        const data = items?.filter((item) => {
            const [, [key]] = item;
            const [dataNode, dataAppType, dataAppId] = key.split(/[-:]/);
            const intNodeId = parseInt(dataNode);
            const intAppId = parseInt(dataAppId);
            return intNodeId === nodeId && dataAppType === appType && intAppId === appId;
        });
        const clientEvent: IDataEvent<IAppIdAppTypeOrigin, IQosData> = {
            ...event,
            payload: {
                items: [],
                quality: 0,
            },
        };
        if (data.length) {
            const [, [, value]] = data[data.length - 1];
            const cleanValue = JSON.parse(value) as IQosData;
            clientEvent.payload = cleanValue;
        }
        return clientEvent;
    }

    private handleQosData() {
        const channels = Array.from(this.qosClients.keys()).map((node) => `qos-${node}`);
        const ids = channels.map(() => "$");
        this.redisQos.xread("COUNT", 1, "BLOCK", 0, "STREAMS", ...channels, ...ids, (err, res) => {
            if (err) {
                this.log(`error occured while handle new value in handleQosData event. Error ${err}`, true);
            } else {
                if (res) {
                    const [rowNodeId, appType, rowAppId] = res[0][1][0][1][0].split(/[-:]/);
                    const appId = parseInt(rowAppId);
                    const nodeId = parseInt(rowNodeId);
                    try {
                        const data = JSON.parse(res[0][1][0][1][1]) as IQosData;
                        this.qosClients
                            .get(nodeId)
                            ?.get(appType)
                            ?.get(appId)
                            ?.forEach((socket) =>
                                socket.emit("data", {
                                    subscriptionType: ESubscriptionType.qos,
                                    origin: {
                                        nodeId,
                                        appType,
                                        appId,
                                    },
                                    payload: data,
                                })
                            );
                        if (this.qosClients.get(nodeId)) {
                            setTimeout(() => this.handleQosData(), 0);
                        }
                    } catch (e) {
                        this.log(`Error occured while sending new Qos data. Error ${e}`, true);
                    }
                }
            }
        });
    }

    // Redis events
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
            this.log(`redis initializing error ${error}`, true);
        }
    }

    private async redisGet(key: string) {
        try {
            const data = await this.redisToKey.get(key);
            return data;
        } catch (e) {
            this.log(`Error occured while getting data from redis. Error ${e}`);
        }
    }

    private redisGetWithInterval(key: string, onData: IOnDataHandler, interval?: number, memoized?: boolean) {
        let previousValue = null;
        const timer = setInterval(async () => {
            const data = await this.redisGet(key);
            if (memoized && data !== previousValue) {
                previousValue = data;
                onData(key, data);
            }
            if (!memoized) {
                onData(key, data);
            }
        }, interval || 1000);
        return timer;
    }

    private redisSubscribeToChannel = (channel: string) => {
        this.redisChannel.subscribe(channel, (error) => {
            if (error) {
                this.log(`redis channel: ${channel} subscribe failure: ${error.name}`, true);
            } else {
                this.log(`redis channel: ${channel} subscribe success`);
            }
        });
    };

    private redisUnsubscribeFromChannel = (channel: string) => {
        this.redisChannel.unsubscribe(channel);
    };

    private handleRedisConnection = () => this.log("redis connection success");

    private handleRedisError = (error) => this.log(`redis error: ${error}`, true);

    private handleRedisSubEvent = (redisChannel: string, redisEvent: string) => {
        try {
            const event: IPubSubData = JSON.parse(redisEvent);
            const appEvent = redisModuleUtils.isRealtimeAppData(event);
            const nodeEvent = redisModuleUtils.isRealtimeNodeData(event);
            if (appEvent) {
                const {appId} = event;
                const [, , nodeIdRow, appType] = redisChannel.split(":");
                let payload: IAppData;
                if (redisModuleUtils.isIAppStatusDataRaw(event)) {
                    const {status, statusChange} = event;
                    payload = {status, statusChange};
                }
                if (redisModuleUtils.isIAppTimingDataRaw(event)) {
                    const {startedAt} = event;
                    payload = {startedAt};
                }
                const dataEvent: IDataEvent<IAppIdAppTypeOrigin, IAppData> = {
                    subscriptionType: ESubscriptionType.app,
                    origin: {
                        appId,
                        nodeId: parseInt(nodeIdRow),
                        appType,
                    },
                    payload,
                };
                this.appChannelClients
                    .get(redisChannel)
                    ?.get(appId)
                    ?.forEach((socket) => socket.emit("data", dataEvent));
            }
            if (nodeEvent) {
                const [, , nodeIdRow] = redisChannel;
                let payload: INodeData;
                const dataEvent: IDataEvent<INodeSubscribeOrigin, INodeData> = {
                    subscriptionType: ESubscriptionType.app,
                    origin: {
                        type: event.type,
                        nodeId: parseInt(nodeIdRow),
                    },
                    payload,
                };
                if (redisModuleUtils.isINodeStatusData(event)) {
                    payload = event;
                } else {
                    const {id, ...rest} = event;
                    payload = rest;
                }
                this.nodeChannelClients
                    .get(redisChannel)
                    ?.get(event.type)
                    ?.forEach((socket) => socket.emit("data", dataEvent));
            }
        } catch (error) {
            this.log(`redis channel: ${redisChannel} event handling error ${error}`, true);
        }
    };

    private handleDisconnect = (socket: Socket) => () => {
        //todo kan: what if one socket was subscribed to a lot of channels? let channel should become Array<string>
        for (const clientsSubType of [this.nodeChannelClients, this.appChannelClients]) {
            for (const channel of clientsSubType.keys()) {
                const specificClients = clientsSubType.get(channel);
                if (specificClients) {
                    specificClients.forEach((sockets: Set<Socket>) => {
                        if (sockets && sockets.has(socket)) {
                            sockets.delete(socket);
                            this.log(`client: ${socket.id} disconnected`);
                        }
                        if (!sockets.size) {
                            clientsSubType.delete(channel);
                            this.log(`channel: ${channel} is empty. Removing redis subscription`);
                            this.redisChannel.unsubscribe(channel);
                        }
                    });
                }
            }
        }
        this.monitoringClients.forEach((_) =>
            _.forEach((__) =>
                __.forEach((sockets) => {
                    if (sockets.has(socket)) {
                        sockets.delete(socket);
                        this.log(`client: ${socket.id} disconnected`);
                    }
                })
            )
        );
        this.qosClients.forEach((_) =>
            _.forEach((__) =>
                __.forEach((sockets) => {
                    if (sockets.has(socket)) {
                        sockets.delete(socket);
                        this.log(`client: ${socket.id} disconnected`);
                    }
                })
            )
        );
    };
}
