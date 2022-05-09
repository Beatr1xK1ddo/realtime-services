import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    IClientSubscribeEvent,
    INodeInitEvent,
    isClientSubscribeEvet,
    IDeviceResponseError,
} from "@socket/shared-types";
import {Socket} from "socket.io";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

export class HyperdeckModule extends MainServiceModule {
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
            const {nodeId, ip, port} = event;
            const deviceId = `${ip}:${port}`;
            const weShouldProceed = isClientSubscribeEvet(event);
            console.log("handle subscribe", event);
            if (!weShouldProceed) {
                socket.emit("responseError", {
                    request: "subscribe",
                    message: "bad request",
                });
                return;
            }
            if (!this.clients.has(nodeId)) {
                this.clients.set(nodeId, new Map());
            }
            if (!this.clients.get(nodeId)?.has(deviceId)) {
                this.clients.get(nodeId)?.set(deviceId, new Set());
            }
            if (!this.clients.get(nodeId)?.get(deviceId)?.has(socket)) {
                this.clients.get(nodeId)?.get(deviceId)?.add(socket);
                this.logger.log.info(
                    `Socket: "${socket.id}" subscribed to: "node: ${nodeId}" and "device ${deviceId}"`
                );
            }
            if (this.nodes.has(nodeId)) {
                this.nodes.get(nodeId)?.emit("subscribe", {socketId: socket.id, event});
            }
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
            if (!devicesSubscribers || !devicesSubscribers.get(deviceId)) {
                return;
            }
            devicesSubscribers.get(deviceId)?.delete(socket);
            this.logger.log.info(
                `Socket: "${socket.id}" unsubscribed from "node: ${nodeId}" and "device ${deviceId}"`
            );
        });
        socket.on("commands", ({nodeId, ...data}: IClientCmdRequestEvent) => {
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                this.logger.log.info(
                    `Commands to node: "${nodeId}" requested to device: "${data.ip}:${data.port}"`
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
            this.logger.log.info(
                `Response was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`
            );
        });

        socket.on("subscriptionError", (data: IDeviceResponseError) => {
            const {ip, port, nodeId} = data;
            const deviceId = `${ip}:${port}`;
            this.clients
                .get(nodeId)
                ?.get(deviceId)
                ?.forEach((socket) => socket.emit("responseError", data));
            this.log(
                `ResponseError was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`
            );
        });

        socket.on("response", ({nodeId, ...data}: IDeviceResponseEvent) => {
            const {ip, port} = data;
            const deviceId = `${ip}:${port}`;
            this.clients
                .get(nodeId)
                ?.get(deviceId)
                ?.forEach((socket) => socket.emit("result", data));
            this.logger.log.info(
                `Response was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`
            );
        });

        socket.on("error", (error) => this.logger.log.error("Socket error: ", error));
    }
}
