import {Socket} from "socket.io";
import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    IClientSubscribeEvent,
    INodeInitEvent,
    isClientSubscribeEvet,
} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

export class TeranexServiceModule extends MainServiceModule {
    private nodes: Map<number, Socket>;
    private clients: Map<number, Map<string, Set<Socket>>>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.nodes = new Map();
        this.clients = new Map();
    }

    protected override onConnected(socket: Socket) {
        socket.on("init", ({nodeId}: INodeInitEvent) => {
            this.log(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        });
        socket.on("subscribe", (event: IClientSubscribeEvent) => {
            const weShouldProceed = isClientSubscribeEvet(event);
            this.log(
                `Client: ${socket.id} attempting to subscribed to ${
                    weShouldProceed ? JSON.stringify(event) : weShouldProceed
                }`
            );
            if (!weShouldProceed) {
                socket.emit("error", {
                    request: "subscribe",
                    message: "bad request",
                });
                return;
            }
            const {nodeId, ip, port} = event;
            const deviceId = `${ip}:${port}`;
            //add self to subscriptions
            if (!this.clients.has(nodeId)) {
                const devicesSubscribers = new Map();
                devicesSubscribers.set(deviceId, new Set([socket]));
                this.clients.set(nodeId, devicesSubscribers);
            } else if (!this.clients.get(nodeId)?.has(deviceId)) {
                this.clients.get(nodeId)?.set(deviceId, new Set([socket]));
            } else {
                this.clients.get(nodeId)?.get(deviceId)?.add(socket);
            }
            //pass subscription message to node service
            if (this.nodes.has(nodeId))
                this.nodes.get(nodeId)?.emit("subscribe", {socketId: socket.id, event});
        });
        socket.on("subscribed", (event: {socketId: string; event: IClientSubscribeEvent}) => {
            const deviceId = `${event.event.ip}:${event.event.port}`;
            const nodeSubscribers = this.clients.get(event.event.nodeId)?.get(deviceId);
            if (nodeSubscribers) {
                const client = Array.from(nodeSubscribers.values()).find(
                    (socket) => socket.id === event.socketId
                );
                if (client) {
                    this.logger.log.info(
                        `Subscribed event to ${JSON.stringify(event.event)} received from ${
                            socket.id
                        } for ${client.id}"`
                    );
                    client.emit("subscribed", event.event);
                }
            }
        });
        socket.on("unsubscribe", ({nodeId, ip, port}: IClientSubscribeEvent) => {
            const deviceId = `${ip}:${port}`;
            const devicesSubscribers = this.clients.get(nodeId);
            if (devicesSubscribers && devicesSubscribers.has(deviceId)) {
                devicesSubscribers.get(deviceId)?.delete(socket);
                this.logger.log.info(
                    `Socket: "${socket.id}" unsubscribed from "node: ${nodeId}" and "device ${deviceId}"`
                );
            }
        });
        socket.on("commands", ({nodeId, ...data}: IClientCmdRequestEvent) => {
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                this.logger.log.info(
                    `Commands to node: "${nodeId}" requested to device "${data.ip}:${data.port}"`
                );
                nodeSocket.emit("request", data);
            }
        });
        socket.on("response", ({nodeId, ...data}: IDeviceResponseEvent) => {
            const {ip, port} = data;
            const deviceId = `${ip}:${port}`;
            this.clients
                .get(nodeId)
                ?.get(deviceId)
                ?.forEach((socket) => socket.emit("result", data));
            this.log(
                `Response was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`
            );
        });
        socket.on("error", (error) => this.logger.log.error("Socket error: ", error));
    }
}
