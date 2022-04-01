import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    IMainServiceModule,
    IClientSubscribeEvent,
    INodeInitEvent,
} from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import { PinoLogger } from '@socket/shared-utils';

export class HyperdeckModule implements IMainServiceModule {
    private io?: Namespace;
    public name: string;
    private nodes: Map<number, Socket>;
    private clients: Map<number, Map<string, Set<Socket>>>;
    private logger = new PinoLogger();

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
            this.logger.log.info(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        });
        socket.on(
            'subscribe',
            ({ nodeId, ip, port }: IClientSubscribeEvent) => {
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
                this.logger.log.info(
                    `Socket: "${socket.id}" subscribed to node: "${nodeId}"`
                );
            }
        );
        socket.on(
            'unsubscribe',
            ({ nodeId, ip, port }: IClientSubscribeEvent) => {
                const deviceId = `${ip}:${port}`;
                const devicesSubscribers = this.clients.get(nodeId);
                if (!devicesSubscribers || !devicesSubscribers.get(deviceId)) {
                    return;
                }
                devicesSubscribers.get(deviceId)?.delete(socket);
                this.logger.log.info(
                    `Socket: "${socket.id}" unsubscribed from node: "${nodeId}"`
                );
            }
        );
        socket.on('commands', ({ nodeId, ...data }: IClientCmdRequestEvent) => {
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                this.logger.log.info(
                    `Commands to node: "${nodeId}" requested to device`
                );
                nodeSocket.emit('request', data);
            }
        });
        socket.on('response', ({ nodeId, ...data }: IDeviceResponseEvent) => {
            const { ip, port } = data;
            const deviceId = `${ip}:${port}`;
            this.clients
                .get(nodeId)
                ?.get(deviceId)
                ?.forEach((socket) => socket.emit('result', data));
            this.logger.log.info(
                `Response was sent to clients with node: "${nodeId}"`
            );
        });

        socket.on('error', (error) =>
            this.logger.log.error('Socket error: ', error)
        );
    }
}