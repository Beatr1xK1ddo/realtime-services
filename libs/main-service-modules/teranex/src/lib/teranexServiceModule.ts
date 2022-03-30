import {Namespace, Socket} from 'socket.io';
import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    IMainServiceModule, IClientSubscribeEvent, INodeInitEvent,
} from '@socket/shared-types';

export class TeranexServiceModule implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private nodes: Map<number, Socket>;
    private clients: Map<number, Map<string, Set<Socket>>>;

    constructor(name: string) {
        this.name = name;
        this.nodes = new Map();
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
        socket.on('init', ({nodeId}: INodeInitEvent) => {
            this.nodes.set(nodeId, socket);
        });
        socket.on('subscribe', ({nodeId, ip, port}: IClientSubscribeEvent) => {
            const deviceId = `${ip}:${port}`;
            if (!this.clients.has(nodeId)) {
                const devicesSubscribers = new Map();
                devicesSubscribers.set(deviceId, new Set([socket]));
                this.clients.set(nodeId, devicesSubscribers);
            }
            if (!this.clients.get(nodeId)?.has(deviceId)) {
                this.clients.get(nodeId)?.set(deviceId, new Set([socket]));
            } else {
                this.clients.get(nodeId)?.get(deviceId)?.add(socket);
            }
        });
        socket.on('unsubscribe', ({nodeId, ip, port}: IClientSubscribeEvent) => {
            const deviceId = `${ip}:${port}`;
            const devicesSubscribers = this.clients.get(nodeId);
            if (!devicesSubscribers || !devicesSubscribers.get(deviceId)) {
                return;
            }
            devicesSubscribers.get(deviceId)?.delete(socket);
        });
        socket.on('commands', ({nodeId, ...data}: IClientCmdRequestEvent) => {
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                nodeSocket.emit('request', data);
            }
        });
        socket.on('response', ({nodeId, ...data}: IDeviceResponseEvent) => {
            const {ip, port} = data;
            const deviceId = `${ip}:${port}`;
            this.clients.get(nodeId)
                ?.get(deviceId)
                ?.forEach(socket => socket.emit("result", data));
        });

    }
}
