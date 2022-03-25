import { Namespace, Socket } from 'socket.io';
import { Mongoose } from 'mongoose';
import { ELogTypes, ILogData, IModule } from '@socket/interfaces';

export class Logger implements IModule {
    private dbURL =
        'mongodb://nxtroot1:sdfj338dsfk22fdskd399s9sss@158.106.77.8:80/logs?authSource=admin';
    private db: Mongoose;
    public name: string;
    private io?: Namespace;
    private clients: Map<ELogTypes, Map<number, Set<Socket>>>;

    constructor(name: string) {
        this.name = name;
        this.clients = new Map();
        for (const name in ELogTypes) {
            this.clients.set(name as ELogTypes, new Map());
        }
        this.db = new Mongoose();
    }

    async init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
            await this.initDbConnection();
        } catch (e) {
            console.log('Ooops, :', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on('subscribe', (nodeId: number, logType: ELogTypes) => {
            if (!this.clients.get(logType)!.has(nodeId)) {
                this.clients.get(logType)!.set(nodeId, new Set());
            }
            this.clients.get(logType)!.get(nodeId)!.add(socket);
        });
        socket.on('unsubscribe', (nodeId: number, logType?: ELogTypes) => {
            const unsubscribeLogTypes = logType
                ? [logType]
                : [ELogTypes.appLog, ELogTypes.sysLog, ELogTypes.all];
            unsubscribeLogTypes.forEach((logType) => {
                this.clients.get(logType)!.get(nodeId)?.delete(socket);
            });
        });

        socket.on('data', this.handleData.bind(this));

        socket.on('error', (error) => console.log('Ooops', error));
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
            console.log('Ooops: ', error);
        }
    }

    private handleData(data: ILogData) {
        const { nodeId, data: logData } = data;
        const clients = this.clients.get(logData.type);
        clients!.get(nodeId)?.forEach((socket) => socket.emit('data', data));

        if (this.db.connection) {
            this.collections[logData.type].insertOne(data);
        }
    }

    get collections() {
        return this.db.connection.collections;
    }
}
