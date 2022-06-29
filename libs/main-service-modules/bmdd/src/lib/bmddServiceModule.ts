import {Socket} from "socket.io";

import {
    IBmddNodeServiceDevicesEvent,
    IBmddNodeServiceInitEvent,
    IBmddNodeServiceSubscribedEvent,
    IBmddNodeServiceSubscribeEvent,
    INodeServiceCommonFaultEvent,
    IServiceCommonFaultOrigin,
    IServiceCommonFaultType,
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
        socket.on("fault", this.handleNodeFault(socket));
        socket.on("subscribed", this.handleNodeSubscribed(socket));
        socket.on("devices", this.handleNodeDevices);
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
            this.log(`node ${nodeId} ${socket.id} initialized successfully`);
            const clients = this.clients.get(nodeId);
            if (clients && clients.size) {
                this.log(`node ${nodeId} ${socket.id} has ${clients.size} subscribers, handling subscribe`);
                clients.forEach((socket) => this.handleNodeSubscription(nodeId, socket));
            }
        }
    };

    private handleNodeFault = (socket: Socket) => (event: INodeServiceCommonFaultEvent) => {
        this.log(`node ${event.nodeId} ${socket.id} error ${event.message}`);
        const clients = this.clients.get(event.nodeId);
        if (clients && clients.size) {
            clients.forEach((socket) => socket.emit("fault", event));
        }
    };

    private handleNodeSubscribed = (socket: Socket) => (event: IBmddNodeServiceSubscribedEvent) => {
        this.log(`handling subscribed for ${event.clientId} from node ${event.nodeId} ${socket.id}`);
        const client = this.getClientById(event.clientId);
        if (client) {
            const subscribedEvent: IBmddNodeServiceDevicesEvent = {
                nodeId: event.nodeId,
                devices: event.devices,
            };
            client.emit("subscribed", subscribedEvent);
        }
    };

    private handleNodeDevices = (event: IBmddNodeServiceDevicesEvent) => {
        const clients = this.clients.get(event.nodeId);
        if (clients) {
            clients.forEach((socket) => socket.emit("devices", event));
        }
    };

    //client event handlers
    private handleNodeSubscription = (nodeId: NumericId, socket: Socket) => {
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
                this.handleNodeSubscription(nodeId, socket);
                this.log(`client ${socket.id} subscribed to node ${nodeId}`);
            }
        } else {
            this.clients.set(nodeId, new Set([socket]));
            this.handleNodeSubscription(nodeId, socket);
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
                    this.log(`node ${nodeId} has no subscribers, unsubscribe event sent`);
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
        const subscribedNodes = Array.from(this.clients.entries()).reduce((result, [nodeId, clients]) => {
            if (clients.has(socket)) {
                result.add(nodeId);
            }
            return result;
        }, new Set() as Set<NumericId>);
        if (subscribedNodes.size) {
            this.log(
                `${socket.id} appears to be a client, subscribed to ${subscribedNodes.size} processing with unsubscribe`
            );
            subscribedNodes.forEach((nodeId) => this.handleUnsubscribe(socket)(nodeId));
            return;
        }
        const node = Array.from(this.nodes.entries()).find(([, node]) => node === socket);
        if (node) {
            this.log(`${socket.id} appears to be a node, removing`);
            const nodeId = node[0];
            this.nodes.delete(nodeId);
            const clients = this.clients.get(nodeId);
            if (clients && clients.size) {
                this.log(`node ${nodeId} ${socket.id} has ${clients.size} subscribers, handling fault`);
                const faultEvent: INodeServiceCommonFaultEvent = {
                    nodeId,
                    origin: IServiceCommonFaultOrigin.node,
                    type: IServiceCommonFaultType.disconnected,
                };
                clients.forEach((socket) => socket.emit("fault", faultEvent));
            }
        }
    };
}
