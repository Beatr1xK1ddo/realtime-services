import { Namespace, Socket } from 'socket.io';
import {
    IClientMessage,
    IDeviceResponseData,
    IMainServiceModule,
} from '@socket/shared-types';

export class TeranexService implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private clients: Map<string, Set<Socket>>;

    constructor(name: string) {
        this.name = name;
        this.clients = new Map();
    }

    async init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        } catch (e) {
            console.log('Ooops, :', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on('cmd', (data: IClientMessage) => {
            const { ip, port } = data;
            const nodeId = `${ip}:${port}`;
            const device = this.clients.get(nodeId);

            if (!device) {
                console.log('device was not found');
                return;
            }

            socket.send(data);
        });

        socket.on('data', (data: IDeviceResponseData) => {
            const { ip, port } = data;
            const nodeId = `${ip}:${port}`;
            if (!this.clients.has(nodeId)) {
                console.log('Can not find node id');
                return;
            }
            const clients = this.clients.get(nodeId);
            clients?.forEach((socket) => socket.emit('message', data));
        });

        socket.on('subscribe', (ip: string, port: number) => {
            const nodeId = `${ip}:${port}`;
            if (!this.clients.has(nodeId)) {
                this.clients.set(nodeId, new Set([socket]));
            }
            this.clients.get(nodeId)?.add(socket);
        });

        socket.on('unsubscribe', (ip: string, port: number) => {
            const nodeId = `${ip}:${port}`;
            const device = this.clients.get(nodeId);
            if (!device) {
                return;
            }
            device.delete(socket);
        });
    }
}
