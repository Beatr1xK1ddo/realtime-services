import {
    IClientCmdRequestEvent,
    IDeviceResponseEvent,
    IClientSubscribeEvent,
    INodeEvent,
    isClientSubscribeEvet,
    IDeviceResponseError,
    IClientSubscribedEvent,
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

    private onNodeServiceInit(socket: Socket) {
        return ({nodeId}: INodeEvent) => {
            this.log(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        };
    }

    private onClientSubscribe(socket: Socket) {
        return (event: IClientSubscribeEvent) => {
            const {nodeId, ip, port} = event;
            const deviceId = `${ip}:${port}`;
            const weShouldProceed = isClientSubscribeEvet(event);

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
                this.log(
                    `Socket: "${socket.id}" subscribed to: "node: ${nodeId}" and "device ${deviceId}"`
                );
            }
            if (this.nodes.has(nodeId)) {
                this.nodes.get(nodeId)?.emit("subscribe", {socketId: socket.id, event});
            }
        };
    }

    private onClientSubscribed(socket: Socket) {
        return (event: IClientSubscribedEvent) => {
            const deviceId = `${event.event.ip}:${event.event.port}`;
            const nodeSubscribers = this.clients.get(event.event.nodeId)?.get(deviceId);
            if (nodeSubscribers) {
                const client = Array.from(nodeSubscribers.values()).find(
                    (socket) => socket.id === event.socketId
                );
                if (client) {
                    this.log(
                        `Subscribed event to ${JSON.stringify(event.event)} received from ${
                            socket.id
                        } for ${client.id}"`
                    );
                    client.emit("subscribed", event.event);
                }
            }
        };
    }

    private onClientUnsubscribed(socket: Socket) {
        return (data: IClientSubscribeEvent) => {
            const {ip, port, nodeId} = data;
            const deviceId = `${ip}:${port}`;
            const devicesSubscribers = this.clients.get(nodeId);
            if (!devicesSubscribers || !devicesSubscribers.get(deviceId)) {
                return;
            }
            devicesSubscribers.get(deviceId)?.delete(socket);
            this.log(
                `Socket: "${socket.id}" unsubscribed from "node: ${nodeId}" and "device ${deviceId}"`
            );
        };
    }

    private onClientCommands(data: IClientCmdRequestEvent) {
        const {nodeId} = data;
        const nodeSocket = this.nodes.get(nodeId);
        if (nodeSocket) {
            this.logger.log.info(
                `Commands to node: "${nodeId}" requested to device: "${data.ip}:${data.port}"`
            );
            nodeSocket.emit("request", data);
        }
    }

    private onClientResponse(data: IDeviceResponseEvent) {
        const {ip, port, nodeId} = data;
        const deviceId = `${ip}:${port}`;
        this.clients
            .get(nodeId)
            ?.get(deviceId)
            ?.forEach((socket) => socket.emit("result", data));
        this.log(`Response was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`);
    }

    private onClientSubscriptionError(data: IDeviceResponseError) {
        const {ip, port, nodeId} = data;
        const deviceId = `${ip}:${port}`;
        this.clients
            .get(nodeId)
            ?.get(deviceId)
            ?.forEach((socket) => socket.emit("responseError", data));
        this.log(
            `ResponseError was sent to clients with "node: ${nodeId}" and "device ${deviceId}"`
        );
    }

    protected override onConnected(socket: Socket) {
        socket.on("nodeServiceInit", this.onNodeServiceInit.call(this, socket));
        socket.on("clientSubscribe", this.onClientSubscribe.call(this, socket));
        socket.on("clientSubscribed", this.onClientSubscribed.call(this, socket));
        socket.on("clientUnsubscribed", this.onClientUnsubscribed.call(this, socket));
        socket.on("clientCommands", this.onClientCommands.bind(this));
        socket.on("clientResponse", this.onClientResponse.bind(this));
        socket.on("clientSubscriptionError", this.onClientSubscriptionError.bind(this));
        socket.on("error", this.onError.bind(this));
    }
}
