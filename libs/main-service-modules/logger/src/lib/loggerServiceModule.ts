import { Namespace, Socket } from 'socket.io';
import { Mongoose } from 'mongoose';
import {
    ELogTypes,
    ILogData,
    IMainServiceModule,
    IPinoOptions,
} from '@socket/shared-types';
import { PinoLogger } from '@socket/shared-utils';

export class LoggerServiceModule implements IMainServiceModule {
    private dbURL = 'mongodb://nxtroot1:sdfj338dsfk22fdskd399s9sss@158.106.77.8:80/logs?authSource=admin';
    private db: Mongoose;
    public name: string;
    private io?: Namespace;
    private clients: Map<ELogTypes, Map<number, Set<Socket>>>;
    private logger: PinoLogger;

    constructor(name: string, loggerOptions?: Partial<IPinoOptions>) {
        this.name = name;
        this.clients = new Map();
        for (const name in ELogTypes) {
            this.clients.set(name as ELogTypes, new Map());
        }
        this.db = new Mongoose();
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
    }

    async init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
            await this.initDbConnection();
        } catch (e) {
            this.logger.log.error('Init error :', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on(
            'subscribe',
            ({ nodeId, logType }: { nodeId: number; logType: ELogTypes }) => {
                if (!this.clients.get(logType)!.has(nodeId)) {
                    this.clients.get(logType)!.set(nodeId, new Set());
                }
                this.clients.get(logType)!.get(nodeId)!.add(socket);
                this.logger.log.info(
                    `Socket "${socket.id}" was subscribed to "log: ${logType}" and "node: ${nodeId}"`
                );
            }
        );
        socket.on('unsubscribe', (nodeId: number, logType?: ELogTypes) => {
            const unsubscribeLogTypes = logType
                ? [logType]
                : [ELogTypes.appLog, ELogTypes.sysLog, ELogTypes.all];
            unsubscribeLogTypes.forEach((logType) => {
                this.clients.get(logType)!.get(nodeId)?.delete(socket);
            });
            this.logger.log.info(
                `Socket "${socket.id}" was unsubscribed from "log: ${logType}" and "node: ${nodeId}"`
            );
        });

        socket.on('data', this.handleData.bind(this));

        socket.on('error', (error) =>
            this.logger.log.error('Socket error: ', error)
        );
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
            this.logger.log.error('DB connection error: ', error);
        }
    }

    private handleData(data: ILogData) {
        const { nodeId, data: logData } = data;
        const clients = this.clients.get(logData.type);
        clients!.get(nodeId)?.forEach((socket) => socket.emit('data', data));
        this.logger.log.info(
            `Sending data to sockets with "log: ${logData.type}" and "node: ${nodeId}"`
        );
        if (this.db.connection) {
            this.collections[logData.type].insertOne(data);
        }
    }

    get collections() {
        return this.db.connection.collections;
    }
}
