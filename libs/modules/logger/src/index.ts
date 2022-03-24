import { Socket, Namespace } from 'socket.io';
import { Mongoose } from 'mongoose';
import { ELogTypes, ILogMessage, IModule } from '@socket/interfaces';

export class Logger implements IModule {
    private dbURL =
        'mongodb+srv://testing:qwerty!123456@cluster0.1qqgw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
    private db: Mongoose;
    public name: string;
    private io?: Namespace;
    private clients: Map<ELogTypes, Set<Socket>> = new Map();

    constructor(name: string) {
        this.db = new Mongoose();
        this.name = name;
    }

    async init(io: Namespace) {
        try {
            this.io = io;
            await this.dbConnection();
            this.io.on('connection', this.onConnection.bind(this));
        } catch (e) {
            console.log('Ooops, :', e);
        }
    }

    private onConnection(socket: Socket) {
        socket.on('unsubscribe', (room: ELogTypes) => {
            this.clients.get(room)?.delete(socket);
        });

        socket.on('data', this.logHandler.bind(this));

        socket.on('error', (error) => console.log('Ooops', error));

        socket.on('subscribe', (room: ELogTypes) => {
            const roomSet = this.clients.get(room);

            if (roomSet?.has(socket)) {
                return;
            }

            roomSet?.add(socket);

            // if (roomSet) {
            //     roomSet.add(socket);
            // }

            // this.clients.set(room, new Set([socket]));
        });
    }

    private async dbConnection() {
        if (this.db.connection.readyState) {
            return;
        }

        try {
            this.db.connection.once('open', this.createCollections);
            await this.db.connect(this.dbURL);
        } catch (error) {
            this.db.connection.close();
            console.log('Ooops: ', error);
        }
    }

    private createCollections() {
        for (const name in ELogTypes) {
            this.db.connection.collection(name);
            this.clients.set(name as ELogTypes, new Set());
        }
    }

    private logHandler(data: ILogMessage) {
        const { type } = data;
        this.clients
            .get(type)
            ?.forEach((socket) => socket.emit('message', data));

        this.collections[type].insertOne(data);
    }

    get collections() {
        return this.db.connection.collections;
    }
}
