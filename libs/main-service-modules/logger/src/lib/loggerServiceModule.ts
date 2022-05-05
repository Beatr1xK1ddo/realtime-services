import {Namespace, Socket} from "socket.io";
import {Mongoose} from "mongoose";
import {ELogTypes, ILogData, ILoggerRequestPayload, IPinoOptions} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

export class LoggerServiceModule extends MainServiceModule {
    private dbURL =
        "mongodb://nxtroot1:sdfj338dsfk22fdskd399s9sss@158.106.77.8:80/logs?authSource=admin";
    private db: Mongoose;
    private io?: Namespace;
    private clients: Map<ELogTypes, Map<number, Set<Socket>>>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.name = name;
        this.clients = new Map();
        for (const name in ELogTypes) {
            this.clients.set(name as ELogTypes, new Map());
        }
        this.db = new Mongoose();
    }

    public override async init(io: Namespace) {
        try {
            super.init(io);
            this.registerHandler("connection", this.handleConnection.bind(this));
            await this.initDbConnection();
        } catch (e) {
            this.logger.log.error("Init error :", e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on("subscribe", ({nodeId, logType}: ILoggerRequestPayload) => {
            const logtype = this.clients.get(logType);

            if (!logtype || logtype.get(nodeId)?.has(socket)) {
                return;
            }

            if (!this.clients.get(logType)?.has(nodeId)) {
                this.clients.get(logType)?.set(nodeId, new Set([socket]));
            } else if (!this.clients.get(logType)?.get(nodeId)?.has(socket)) {
                this.clients.get(logType)?.get(nodeId)?.add(socket);
            }
            this.logger.log.info(
                `Socket "${socket.id}" was subscribed to "log: ${logType}" and "node: ${nodeId}"`
            );
        });

        socket.on("unsubscribe", ({nodeId, logType}: ILoggerRequestPayload) => {
            const logtype = this.clients.get(logType);

            if (!logtype || !logtype.get(nodeId) || !logtype.get(nodeId)?.has(socket)) {
                return;
            }

            logtype.get(nodeId)?.delete(socket);
            this.logger.log.info(
                `Socket "${socket.id}" was unsubscribed from "log: ${logType}" and "node: ${nodeId}"`
            );
        });

        socket.on("data", this.handleData.bind(this));

        socket.on("error", (error) => this.logger.log.error("Socket error: ", error));
    }

    private async initDbConnection() {
        if (this.db.connection.readyState) return;

        try {
            await this.db.connect(this.dbURL);
            for (const name in ELogTypes) {
                this.db.connection.collection(name);
            }
        } catch (error) {
            this.db.connection.close();
            this.logger.log.error("DB connection error: ", error);
        }
    }

    private handleData(data: ILogData) {
        const {nodeId, data: logData} = data;
        const clients = this.clients.get(logData.type)?.get(nodeId);

        if (this.db.connection) {
            this.collections[logData.type].insertOne(data);
        }

        if (!clients || !clients.size) return;

        clients.forEach((socket) => socket.emit("response", data));
        this.logger.log.info(
            `Sending data to sockets with "logType: ${logData.type}" and "nodeId: ${nodeId}"`
        );
    }

    get collections() {
        return this.db.connection.collections;
    }
}
