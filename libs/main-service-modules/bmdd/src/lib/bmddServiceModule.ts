import {Socket} from "socket.io";

import {
    IBmddNodeServiceDevicesEvent,
    IBmddNodeServiceErrorEvent,
    IBmddNodeServiceInitEvent,
    IBmddNodeServiceSubscribedEvent,
    IBmddNodeServiceSubscribeEvent,
    IBmddServiceModuleErrorEvent,
    NumericId,
} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

export class BmddServiceModule extends MainServiceModule {
    private nodes: Map<number, Socket>;
    private clients: Map<number, Set<Socket>>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.clients = new Map();
        this.nodes = new Map();
    }

    protected override onConnected(socket: Socket) {
        super.onConnected(socket);
        //node events
        socket.on("init", this.handleNodeInit(socket));
        socket.on("nodeError", this.handleNodeError(socket));
        socket.on("subscribed", this.handleNodeSubscribed(socket));
        socket.on("devices", this.handleNodeDevices());
        //clients events
        socket.on("subscribe", this.handleSubscribe(socket));
        socket.on("unsubscribe", this.handleUnsubscribe(socket));
        //common events
        socket.on("disconnect", this.handleDisconnect(socket));
    }

    //node events handlers
    private handleNodeInit = (socket: Socket) => (event: IBmddNodeServiceInitEvent) => {
        const {nodeId} = event;
        if (this.nodes.has(nodeId)) {
            this.log(`node ${nodeId} ${socket.id} initialized already`);
        } else {
            this.nodes.set(nodeId, socket);
            this.log(`node ${nodeId} ${socket.id} subscribed successfully`);
            const clients = this.clients.get(nodeId);
            if (clients) {
                clients.forEach((socket) => {
                    const subscribedEvent: IBmddNodeServiceSubscribedEvent = {
                        ...event,
                        clientId: socket.id,
                    };
                    this.handleNodeSubscribed(socket)(subscribedEvent);
                });
            }
        }
    };

    private handleNodeError = (socket: Socket) => (event: IBmddNodeServiceErrorEvent) => {
        this.log(`node ${event.nodeId} ${socket.id} error ${event.message}`);
    };

    private handleNodeSubscribed = (socket: Socket) => (event: IBmddNodeServiceSubscribedEvent) => {
        this.log(`node ${event.nodeId} ${socket.id} handling subscribed from ${event.clientId}`);
        const clients = this.clients.get(event.nodeId);
        if (clients) {
            const subscribedEvent: IBmddNodeServiceDevicesEvent = {
                nodeId: event.nodeId,
                devices: event.devices,
            };
            this.socket?.sockets.get(event.clientId)?.emit("subscribed", subscribedEvent);
        }
    };

    private handleNodeDevices = () => (event: IBmddNodeServiceDevicesEvent) => {
        const clients = this.clients.get(event.nodeId);
        if (clients) {
            clients.forEach((socket) => socket.emit("devices", event));
        }
    };

    //client event handlers
    private sendNodeSubscribeEvent = (nodeId: NumericId, socket: Socket) => {
        const node = this.nodes.get(nodeId);
        if (node) {
            const subscribeEvent: IBmddNodeServiceSubscribeEvent = {
                clientId: socket.id,
            };
            node.emit("subscribe", subscribeEvent);
        }
    };

    private handleSubscribe = (socket: Socket) => (nodeId: NumericId) => {
        const clients = this.clients.get(nodeId);
        if (clients) {
            if (clients.has(socket)) {
                this.log(`client ${socket.id} already subscribed to node ${nodeId}`);
                return;
            } else {
                clients.add(socket);
                this.sendNodeSubscribeEvent(nodeId, socket);
                this.log(`client ${socket.id} subscribed to node ${nodeId}`);
            }
        } else {
            this.clients.set(nodeId, new Set([socket]));
            this.sendNodeSubscribeEvent(nodeId, socket);
            this.log(`client ${socket.id} subscribed to node ${nodeId}`);
        }
    };

    private handleUnsubscribe = (socket: Socket) => (nodeId: number) => {
        const clients = this.clients.get(nodeId);
        if (clients && clients.has(socket)) {
            clients.delete(socket);
            if (clients.size === 0) {
                const node = this.nodes.get(nodeId);
                if (node) {
                    node.emit("unsubscribe");
                    this.log(`node ${nodeId} has no subscribers, sending unsubscribe event`);
                }
            }
            this.log(`client ${socket.id} unsubscribed from node ${nodeId}`);
        } else {
            this.log(`client ${socket.id} can't unsubscribe from node ${nodeId}`);
        }
    };

    //common event handlers
    private handleDisconnect = (socket: Socket) => (reason: string) => {
        super.onDisconnected(reason);
        this.log(`${socket.id} handling disconnected event`);
        const client = Array.from(this.clients.values()).some((clients) => clients.has(socket));
        if (client) {
            this.log(`${socket.id} appears to be a client, processing with unsubscribe`);
            this.handleUnsubscribe(socket);
            return;
        }
        const node = Array.from(this.nodes.entries()).find(([, node]) => node === socket);
        if (node) {
            this.log(`${socket.id} appears to be a node, removing`);
            const nodeId = node[0];
            this.nodes.delete(nodeId);
            const clients = this.clients.get(nodeId);
            if (clients && clients.size) {
                this.log(`node ${nodeId} ${socket.id} has ${clients.size} subscribers, handling error`);
                const errorEvent: IBmddServiceModuleErrorEvent = {
                    nodeId,
                    message: "node service offline",
                };
                clients.forEach((socket) => socket.emit("serviceError", errorEvent));
            }
        }
    };
}
