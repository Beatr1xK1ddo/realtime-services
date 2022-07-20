import {Namespace, Socket} from "socket.io";
import {Connection, Mongoose} from "mongoose";

import {Common, LoggingService} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

interface LoggingModuleOptions extends MainServiceModuleOptions {
    dbUrl: string;
}

//todo: what if there is no connection to mongo???? :/
export class LoggingModule extends MainServiceModule {
    private dbUrl: string;
    private db: Mongoose;
    private nodes: Map<Common.INodeId, LoggingService.INode>;
    private appLogsSubscribers: Map<
        Common.INodeId,
        Map<Common.IAppType, Map<Common.IAppId, Map<LoggingService.IAppLogType, Set<Socket>>>>
    >;

    // private clientsTypes: Map<number, Map<string, Map<number, Set<Socket>>>>;
    // private clientsType: Map<number, Map<string, Map<number, Map<string, Set<Socket>>>>>;

    constructor(name: string, options: LoggingModuleOptions) {
        super(name, options);
        this.dbUrl = options.dbUrl;
        this.db = new Mongoose();
        this.nodes = new Map();
        this.appLogsSubscribers = new Map();
        // this.clientsTypes = new Map();
        // this.clientsType = new Map();
    }

    public override async init(io: Namespace) {
        try {
            super.init(io);
            try {
                await this.initDbConnection();
            } catch (error) {
                this.log(`DB connection failure ${error}. let's try one more time`, true);
                await this.initDbConnection();
            }
        } catch (error) {
            this.log(`init failure ${error}`, true);
        }
    }

    //db handlers
    private dbConnectionEstablished() {
        return this.db && this.db.connection && this.db.connection.readyState === 1;
    }

    private async initDbConnection() {
        const connection = (await this.db.connect(this.dbUrl)).connection;
        this.log("DB connection established");
        await this.testCollection(connection, LoggingService.EServiceLogType.app);
        await this.testCollection(connection, LoggingService.EServiceLogType.sys);
    }

    private async testCollection(connection: Connection, name: string) {
        const collections = await connection.db.listCollections().toArray();
        if (collections.some((collection) => collection.name === name)) {
            this.log(`${name} collection already exist, continue`);
        } else {
            this.log(`${name} collection not exist, creating`);
            await connection.createCollection(name);
        }
    }

    //module handlers
    protected override onConnected(socket: Socket): void {
        super.onConnected(socket);
        //node
        socket.on("initNode", this.handleNodeInit.call(this, socket));
        socket.on("appLogsTypes", this.handleNodeAppLogsTypes.bind(this));
        socket.on("data", this.handleNodeLogRecords.bind(this));
        //subscribers
        socket.on("init", this.handleSubscriberInit.call(this, socket));
        socket.on("subscribe", this.handleSubscribe.call(this, socket));
        socket.on("unsubscribe", this.handleUnsubscribe.call(this, socket));
        socket.on("disconnect", this.handleDisconnect.call(this, socket));
        socket.on("error", this.onError.bind(this));
    }

    // node handlers
    private handleNodeInit(socket: Socket) {
        return (event: LoggingService.INodeInitEvent) => {
            //init node itself
            const node = {connection: socket, apps: new Map()};
            //we will create this Map<Common.IAppType, Map<Common.IAppId, Set<IAppLogType>>>
            event.appsLogsTypes.forEach(app => {
                const appsIdsToTypesMap = node.apps.get(app.appType) ?? new Map();
                const appLogsTypes = new Set(app.appLogsTypes);
                appsIdsToTypesMap.set(app.appId, appLogsTypes)
                node.apps.set(app.appType, appsIdsToTypesMap);
            })
            this.nodes.set(event.nodeId, node);
            this.logNode(event.nodeId)("initialized successfully");
            //test if there is pending subscriptions
            if (this.appLogsSubscribers.has(event.nodeId)) {
                //todo: handle subscription
            }
        };
    }

    private handleNodeAppLogsTypes(event: LoggingService.INodeAppLogsTypesEvent) {
        //todo: update this.appLogsSubscribers keys on changed
        const {appId, appType, nodeId, appLogsTypes} = event;
        this.logApp(nodeId, appType, appId)(`has ${appLogsTypes} logs types`);
        if (this.nodes.get(nodeId)?.apps.has(appType)) {
            this.logApp(nodeId, appType, appId)(`updating types`);
            this.nodes.get(nodeId)!.apps.get(appType)!.set(appId, new Set(appLogsTypes));
        } else if (this.nodes.has(nodeId)) {
            this.logApp(nodeId, appType, appId)(`setting types`);
            this.nodes.get(nodeId)!.apps.set(appType, new Map([[appId, new Set(appLogsTypes)]]));
        } else {
            this.logNode(nodeId)("wasn't initialized can't update/set app logs types, continue", true);
            return;
        }
        this.updateSubscribersWithAppLogsTypes(nodeId, appType, appId);
    }

    private updateSubscribersWithAppLogsTypes(nodeId: Common.INodeId, appType: Common.IAppType, appId: Common.IAppId) {
        const types = Array.from(this.nodes.get(nodeId)?.apps.get(appType)?.get(appId) || []);
        const subscribers = this.appLogsSubscribers.get(nodeId)?.get(appType)?.get(appId);
        if (subscribers) {
            const appSubscribers = new Set<Socket>();
            subscribers.forEach((sockets) => {
                sockets.forEach(appSubscribers.add);
            });
            this.logApp(nodeId, appType, appId)(`updating ${subscribers.size} subscribers with app logs types`);
            const event: LoggingService.INodeAppLogsTypesEvent = {nodeId, appType, appId, appLogsTypes: types};
            appSubscribers.forEach((socket) => socket.emit("appLogsTypes", event));
        }
    }

    private async handleNodeLogRecords(event: LoggingService.INodeLogRecordsEvent) {
        if (this.dbConnectionEstablished()) {
            await this.saveNodeLogRecordsToDb(event);
            if (event.serviceLogType === LoggingService.EServiceLogType.app) {
                const {nodeId, appType, appId, appLogType} = event as LoggingService.INodeAppLogRecordsEvent;
                const subscribers = this.appLogsSubscribers.get(nodeId)?.get(appType)?.get(appId)?.get(appLogType);
                if (subscribers) {
                    subscribers.forEach((socket) => socket.emit("data", event));
                }
            }
            if (event.serviceLogType === LoggingService.EServiceLogType.sys) {
                //todo: handle sys log subscribers
            }
        } else {
            //todo: what if not???
        }
    }

    //service handlers
    private async saveNodeLogRecordsToDb(event: LoggingService.INodeLogRecordsEvent) {
        const collectionName = event.serviceLogType;
        try {
            const dbRecords = this.nodeToDbLogRecordsMapper(event);
            await this.db.connection.collection(collectionName).insertMany(dbRecords);
        } catch (e) {
            this.log(`failed to save ${collectionName} logs records to DB`, true);
        }
    }

    private nodeToDbLogRecordsMapper(event: LoggingService.INodeLogRecordsEvent) {
        if (event.serviceLogType === LoggingService.EServiceLogType.app) {
            const {nodeId, appType, appId, appName, appLogType} = event as LoggingService.INodeAppLogRecordsEvent;
            return event.records.map(
                (record) =>
                    ({
                        nodeId,
                        appType,
                        appId,
                        appName,
                        appLogType,
                        created: new Date(record.created),
                        message: record.message,
                    } as LoggingService.IDbAppLogRecord)
            );
        } else {
            return event.records.map(
                (record) =>
                    ({
                        nodeId: event.nodeId,
                        created: new Date(record.created),
                        message: record.message,
                    } as LoggingService.IDbSysLogRecord)
            );
        }
    }

    // client subscriptions
    private handleSubscriberInit(socket: Socket) {
        //todo: what if we don't want to handle app logs?
        return (event: LoggingService.ISubscriberInitEvent) => {
            const {nodeId, appId, appType} = event;
            this.logApp(nodeId, appType, appId)(`handling init event from ${socket.id}`);
            const appLogsTypesSet = this.nodes.get(nodeId)?.apps.get(appType)?.get(appId);
            const appLogsTypes = appLogsTypesSet ? Array.from(appLogsTypesSet) : null;
            const appLogsTypesEvent: LoggingService.INodeAppLogsTypesEvent = {nodeId, appType, appId, appLogsTypes};
            socket.emit("appLogsTypes", appLogsTypesEvent);
        };
    }

    private handleSubscribe(socket: Socket) {
        //todo: this only handles app logs, what about sys logs?
        return (event: LoggingService.ISubscribeAppLogsEvent) => {
            const {nodeId, appId, appType, appLogsTypes} = event;
            const nodeAppLogsTypesAvailable = this.nodes.get(nodeId)?.apps.get(appType)?.get(appId);
            const appLogsTypesToSubscribeTo = appLogsTypes ? appLogsTypes : nodeAppLogsTypesAvailable;
            if (this.appLogsSubscribers.get(nodeId)?.get(appType)?.has(appId)) {
                //NOP
            } else if (this.appLogsSubscribers.get(nodeId)?.has(appType)) {
                this.appLogsSubscribers.get(nodeId)!.get(appType)!.set(appId, new Map());
            } else if (this.appLogsSubscribers.has(nodeId)) {
                this.appLogsSubscribers.get(nodeId)!.set(appType, new Map([[appId, new Map()]]));
            } else {
                this.appLogsSubscribers.set(nodeId, new Map([[appType, new Map([[appId, new Map()]])]]));
            }
            appLogsTypesToSubscribeTo?.forEach(appLogType => {
                const logTypeSubscribers = this.appLogsSubscribers.get(nodeId)?.get(appType)?.get(appId)?.get(appLogType);
                if (logTypeSubscribers) {
                    logTypeSubscribers.add(socket);
                } else {
                    this.appLogsSubscribers.get(nodeId)?.get(appType)?.get(appId)?.set(appLogType, new Set([socket]));
                }
            });
            this.logApp(nodeId, appType, appId)(`${socket.id} subscribed successfully`);
        };
    }

    private handleUnsubscribe(socket: Socket) {
        return (event: LoggingService.IUnsubscribeAppLogsEvent) => {
            const {nodeId, appId, appType, appLogsTypes} = event;
            const subscribers = this.appLogsSubscribers.get(nodeId)?.get(appType)?.get(appId);
            if (subscribers) {
                const nodeAppLogsTypesAvailable = this.nodes.get(nodeId)?.apps.get(appType)?.get(appId);
                const appLogsTypesToUnsubscribeFrom = appLogsTypes ?? nodeAppLogsTypesAvailable;
                appLogsTypesToUnsubscribeFrom?.forEach(appLogType => {
                    subscribers.get(appLogType)?.delete(socket);
                })
                this.logApp(nodeId, appType, appId)(`${socket.id} unsubscribed successfully`);
            }
        };
    }

    private handleDisconnect(socket: Socket) {
        return (reason: string) => {
            this.log(`${socket.id} disconnected`);
            //todo: make this better
            //clear subscribers
            this.appLogsSubscribers.forEach(nodeSubscribers => {
                nodeSubscribers.forEach(appTypeSubscribers => {
                    appTypeSubscribers.forEach(appSubscribers => {
                        appSubscribers.forEach(subscribers => {
                            if (subscribers.has(socket)) {
                                this.log(`${socket.id} seems to be a subscriber, removing from app subscribers`);
                                subscribers.delete(socket);
                            }
                        })
                    });
                })
            });
            //clear nodes
            this.nodes.forEach((nodeItem, id) => {
                if (nodeItem.connection === socket) {
                    this.log(`${socket.id} seems to be a node, removing from nodes`);
                    this.nodes.delete(id);
                }
            });
        };
    }

    //service specific
    private logNode(nodeId: Common.INodeId) {
        return (message: string, error?: boolean) => {
            this.log(`node ${nodeId} ${message}`, error);
        };
    }

    private logApp(nodeId: Common.INodeId, appType: Common.IAppType, appId: Common.IAppId) {
        return (message: string, error?: boolean) => {
            this.log(`node ${nodeId} ${appType}:${appId} ${message}`, error);
        };
    }
}
