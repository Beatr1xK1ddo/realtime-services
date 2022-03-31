import {
    IClientNextomeetResEvent,
    IMainServiceModule,
    INodeInitEvent,
    IClientNextomeetReqEvent,
    IClientNextomeetSubEvent,
} from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';

export class NextomeetModule implements IMainServiceModule {
    private io?: Namespace;
    public name: string;
    private nodes: Map<number, Socket>;
    private clients: Map<number, Set<Socket>>;

    constructor(name: string) {
        this.name = name;
        this.nodes = new Map();
        this.clients = new Map();
    }

    init(io: Namespace) {
        this.io = io;
        this.io.on('connection', this.handleConnection.bind(this));
    }

    private handleConnection(socket: Socket) {
        socket.on('init', ({ nodeId }: INodeInitEvent) => {
            this.nodes.set(nodeId, socket);
        });
        socket.on('subscribe', ({ nodeId }: IClientNextomeetSubEvent) => {
            if (!this.clients.has(nodeId)) {
                const nodeSubscribers = new Map();
                nodeSubscribers.set(nodeId, new Set([socket]));
            } else {
                this.clients.get(nodeId)?.add(socket);
            }
        });
        socket.on('unsubscribe', ({ nodeId }: IClientNextomeetSubEvent) => {
            const devicesSubscribers = this.clients.get(nodeId);
            if (!devicesSubscribers) {
                return;
            }
            devicesSubscribers.delete(socket);
        });
        socket.on('commands', (data: IClientNextomeetReqEvent) => {
            const { nodeId } = data;
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                nodeSocket.emit('request', data);
            }
        });
        socket.on('response', (data: IClientNextomeetResEvent) => {
            const { nodeId } = data;
            this.clients
                .get(nodeId)
                ?.forEach((socket) => socket.emit('result', data));
        });
    }
}
