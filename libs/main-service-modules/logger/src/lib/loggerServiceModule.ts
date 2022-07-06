import {Namespace, Socket} from "socket.io";
import {Mongoose} from "mongoose";
import {
    ILogClientTypesEvent,
    ILogClientTypeEvent,
    ILogNodeTypesDataEvent,
    ILogDbInsertEvent,
} from "@socket/shared-types";
import {loggerUtils} from "@socket/shared-utils";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

type ILoggerNode = {
    socket: Socket;
    apps: Map<string, Map<number, Set<string>>>;
};

type IClientsToUpdateType = {
    [key: string]: boolean;
};

type ILoggerTypeFilter = {
    nodeId: number;
    appType: string;
    appId: number;
    subType: string;
};

const applicationLog = "applicationLog";
const systemLog = "systemLog";

export class LoggerServiceModule extends MainServiceModule {
    // private dbURL = "mongodb://nxtroot1:sdfj338dsfk22fdskd399s9sss@158.106.77.8:80/logs?authSource=admin";
    private dbURL = "mongodb+srv://admin1:admin1@cluster0.u3qaj.mongodb.net/?retryWrites=true&w=majority";
    private db: Mongoose;
    private clientsTypes: Map<number, Map<string, Map<number, Set<Socket>>>>;
    private clientsType: Map<number, Map<string, Map<number, Map<string, Set<Socket>>>>>;
    private nodes: Map<number, ILoggerNode>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.clientsTypes = new Map();
        this.clientsType = new Map();
        this.nodes = new Map();
        this.db = new Mongoose();
    }

    public override async init(io: Namespace) {
        try {
            super.init(io);
            await this.initDbConnection();
        } catch (e) {
            this.log("logger init method error", true);
        }
    }

    protected override onConnected(socket: Socket): void {
        super.onConnected(socket);

        socket.on("subscribeTypes", this.onSubscribeTypes.call(this, socket));

        socket.on("subscribeType", this.onSubscribeType.call(this, socket));

        socket.on("unsubscribeTypes", this.onUnsubscribeTypes.call(this, socket));

        socket.on("unsubscribeType", this.onUnsubscribeType.call(this, socket));

        socket.on("dataTypes", this.handleDataTypes.bind(this));

        socket.on("dataType", this.handleDataType.bind(this));

        socket.on("init", this.onInit.call(this, socket));

        socket.on("disconnect", this.handleDisconnect.call(this, socket));

        socket.on("error", this.onError.bind(this));
    }

    // client subscriptions
    private onSubscribeTypes(socket: Socket) {
        return (event: ILogClientTypesEvent) => {
            const {nodeId, appId, appType} = event;
            if (this.clientsTypes.get(nodeId)?.get(appType)?.get(appId)?.has(socket)) {
                this.log(
                    `client: ${socket.id} already subscribed to node ${nodeId}, app-type: ${appType} and app-id: ${appId}`,
                    true
                );
                return;
            }
            if (this.clientsTypes.get(nodeId)?.get(appType)?.has(appId)) {
                this.clientsTypes.get(nodeId)?.get(appType)?.get(appId)?.add(socket);
            } else if (this.clientsTypes.get(nodeId)?.has(appType)) {
                this.clientsTypes
                    .get(nodeId)
                    ?.get(appType)
                    ?.set(appId, new Set([socket]));
            } else if (this.clientsTypes.has(nodeId)) {
                this.clientsTypes.get(nodeId)?.set(appType, new Map([[appId, new Set([socket])]]));
            } else {
                const appIdMap = new Map([[appId, new Set([socket])]]);
                this.clientsTypes.set(nodeId, new Map([[appType, appIdMap]]));
            }
            this.log(`client: ${socket.id} subscribed successfuly`);
            this.sendDataTypes(nodeId, appType, appId);
        };
    }

    private onSubscribeType(socket: Socket) {
        return (event: ILogClientTypeEvent) => {
            const {nodeId, appId, appType, logType} = event;
            if (this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.get(logType)?.has(socket)) {
                this.log(
                    `client: ${socket.id} already subscribed to node: ${nodeId}, app-type: ${appType}, app-id: ${appId} and ${logType}`
                );
                return;
            }
            if (this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.has(logType)) {
                this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.get(logType)?.add(socket);
            } else if (this.clientsType.get(nodeId)?.get(appType)?.has(appId)) {
                this.clientsType
                    .get(nodeId)
                    ?.get(appType)
                    ?.get(appId)
                    ?.set(logType, new Set([socket]));
            } else if (this.clientsType.get(nodeId)?.has(appType)) {
                this.clientsType
                    .get(nodeId)
                    ?.get(appType)
                    ?.set(appId, new Map([[logType, new Set([socket])]]));
            } else if (this.clientsType.has(nodeId)) {
                const appIdMap = new Map([[logType, new Set([socket])]]);
                const appTypeMap = new Map([[appId, appIdMap]]);
                this.clientsType.get(nodeId)?.set(appType, appTypeMap);
            } else {
                const appIdMap = new Map([[logType, new Set([socket])]]);
                const appTypeMap = new Map([[appId, appIdMap]]);
                this.clientsType.set(nodeId, new Map([[appType, appTypeMap]]));
            }
            this.log(`client: ${socket.id} subscribed successfuly`);
            const filter: ILoggerTypeFilter = {
                nodeId,
                appId,
                appType,
                subType: logType,
            };
            this.sendDataType(filter, [socket]);
        };
    }

    // client unsubscriptions
    private onUnsubscribeTypes(socket: Socket) {
        return (event: ILogClientTypesEvent) => {
            const {nodeId, appId, appType} = event;
            if (this.clientsTypes.get(nodeId)?.get(appType)?.get(appId)?.has(socket)) {
                this.clientsTypes.get(nodeId)?.get(appType)?.get(appId)?.delete(socket);
                this.log(`client ${socket.id} unsubscribed from "Types" successfuly`);
            } else {
                this.log(
                    `can not unsubscribe client ${socket.id} from "Types". Node: ${nodeId} and app-type: ${appType} with id: ${appId}`,
                    true
                );
            }
        };
    }

    private onUnsubscribeType(socket: Socket) {
        return (event: ILogClientTypeEvent) => {
            const {nodeId, appId, appType, logType} = event;
            if (this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.get(logType)?.has(socket)) {
                this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.get(logType)?.delete(socket);
                this.log(`client ${socket.id} unsubscribed from "Type" successfuly`);
            } else {
                this.log(
                    `can not unsubscribe client ${socket.id} from "Type". Node: ${nodeId} and app-type: ${appType} with id: ${appId}`
                );
            }
        };
    }

    // client event handlers
    private sendDataTypes(nodeId: number, appType: string, appId: number) {
        const types = Array.from(this.nodes.get(nodeId)?.apps.get(appType)?.get(appId) || []);
        const nodeClients = this.clientsTypes.get(nodeId)?.get(appType)?.get(appId);
        if (nodeClients) {
            nodeClients.forEach((socket) => {
                socket.emit("nodeDataTypes", types);
            });
            this.log(
                `sending "Log Types" data to sockets with nodeId: ${nodeId}, app-type: ${appType} and app-id: ${appId}`
            );
        }
    }

    private async sendDataType(filter: ILoggerTypeFilter, clients: Socket | Array<Socket>) {
        const senders = Array.isArray(clients) ? clients : [clients];
        let logs: any;
        if (this.db.connection) {
            try {
                const logs = await this.db.connection.collection(applicationLog).find(filter).toArray();
                senders.forEach((socket) => socket.emit("nodeDataType", logs));
            } catch (e) {
                this.log(`error occured while filtering data from collection ${applicationLog}. Error: ${e}`, true);
                logs = [];
            }
        } else {
            senders.forEach((socket) => socket.emit("nodeDataType", logs));
        }
    }

    // node handlers
    private onInit(socket: Socket) {
        return (nodeId: number) => {
            const node = this.nodes.get(nodeId);
            if (node) {
                this.log(`node: ${nodeId} was already initialized`, true);
                return;
            }
            this.nodes.set(nodeId, {socket, apps: new Map()});
            this.log(`node: ${nodeId} was initialized successfuly`);
        };
    }

    private handleDataTypes(event: ILogNodeTypesDataEvent) {
        const {
            channel: {appId, appType, nodeId},
            data,
        } = event;
        if (this.nodes.get(nodeId)?.apps.has(appType)) {
            this.nodes.get(nodeId)!.apps.get(appType)?.set(appId, new Set(data));
        } else if (this.nodes.has(nodeId)) {
            this.nodes.get(nodeId)!.apps.set(appType, new Map([[appId, new Set(data)]]));
        }
        this.sendDataTypes(nodeId, appType, appId);
    }

    private async handleDataType(event: ILogDbInsertEvent) {
        if (this.db.connection) {
            if (loggerUtils.isIAppLogMessage(event)) {
                await this.insertDataTypeToDb(event, applicationLog);
                const messages = Array.isArray(event) ? event : [event];
                const toUpdate: IClientsToUpdateType = {};
                messages.forEach((message) => {
                    const {nodeId, appType, appId, subType} = message;
                    const clients = this.clientsType.get(nodeId)?.get(appType)?.get(appId)?.get(subType);
                    if (clients) {
                        const key = `${nodeId}-${appType}-${appId}`;
                        if (!toUpdate[key]) {
                            const filter: ILoggerTypeFilter = {
                                nodeId,
                                appId,
                                appType,
                                subType,
                            };
                            this.sendDataType(filter, Array.from(clients));
                            toUpdate[key] = true;
                        }
                    }
                });
            } else {
                this.insertDataTypeToDb(event, systemLog);
            }
        }
    }

    private async insertDataTypeToDb(event: ILogDbInsertEvent, collectionName: string) {
        try {
            if (Array.isArray(event)) {
                if (event.length) {
                    await this.db.connection.collection(collectionName).insertMany(event);
                }
            } else {
                await this.db.connection.collection(collectionName).insertOne(event);
            }
        } catch (e) {
            this.log(`can not insert data to "${collectionName}" collection`, true);
        }
    }

    // db handlers
    private async initDbConnection() {
        if (this.db.connection.readyState) return;
        try {
            await this.db.connect(this.dbURL);
            this.log(`DB connected successfuly`);
        } catch (error) {
            this.db.connection.close();
            this.log(`DB connection error: ${error}`, true);
        }
        [applicationLog, systemLog].forEach(async (name) => {
            try {
                await this.db.connection.createCollection(name);
            } catch (e) {
                this.log(`collection "${name}" already exist`);
            }
        });
    }

    // socket handlers
    private handleDisconnect(socket: Socket) {
        return (reason: string) => {
            super.onDisconnected(reason);
            this.clientsTypes.forEach((appTypeMap, nodeId) =>
                appTypeMap.forEach((appIdMap, appType) =>
                    appIdMap.forEach((sockets, appId) => {
                        if (sockets.has(socket)) {
                            sockets.delete(socket);
                            this.log(
                                `client ${socket.id} was disconnected from node ${nodeId}, app-type: ${appType} and app-id: ${appId}`
                            );
                        }
                    })
                )
            );
            this.clientsType.forEach((appTypeMap, nodeId) =>
                appTypeMap.forEach((appIdMap, appType) =>
                    appIdMap.forEach((logTypesMap, appId) =>
                        logTypesMap.forEach((sockets, logType) => {
                            if (sockets.has(socket)) {
                                sockets.delete(socket);
                                this.log(
                                    `client ${socket.id} was disconnected from node ${nodeId}, app-type: ${appType}, app-id: ${appId} and log-type ${logType}`
                                );
                            }
                        })
                    )
                )
            );
            this.nodes.forEach((node, nodeId) => {
                if (socket.id === node.socket.id) {
                    this.nodes.delete(nodeId);
                    this.log(`node ${socket.id} was disconnected`);
                }
            });
        };
    }
}
