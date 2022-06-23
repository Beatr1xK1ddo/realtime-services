import {IDecklinkNodeEvent} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";
import {Socket} from "socket.io";

export class DecklinkLiveMonitor extends MainServiceModule {
    private clients: Map<number, Set<Socket>>;
    private nodes: Map<number, Socket>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.clients = new Map();
        this.nodes = new Map();
    }

    protected override onConnected(socket: Socket) {
        super.onConnected(socket);
        socket.on("subscribe", this.onSubscribeClient(socket));
        socket.on("unsubscribe", this.onUnsubscribeClient(socket));
        socket.on("disconnect", this.onDisconnect(socket));
        socket.on("data", this.onData);
        socket.on("init", this.onSubscribeNode(socket));
    }

    private onSubscribeClient = (socket: Socket) => (nodeId: number) => {
        if (this.clients.get(nodeId)?.has(socket)) {
            this.log(`client ${socket.id} already subscribed to node: ${nodeId}`);
            return;
        }
        if (!this.clients.has(nodeId)) {
            this.clients.set(nodeId, new Set([socket]));
        } else if (!this.clients.get(nodeId)?.has(socket)) {
            this.clients.get(nodeId)?.add(socket);
        }
        const node = this.nodes.get(nodeId);
        if (node) {
            node.emit("subscribe");
        }
        this.log(`client ${socket.id} subscribed successfuly`);
    };

    private onUnsubscribeClient = (socket: Socket) => (nodeId: number) => {
        const nodeClients = this.clients.get(nodeId);
        if (nodeClients && nodeClients.has(socket)) {
            nodeClients.delete(socket);
            this.log(`client ${socket.id} was unsubscribed from node: ${nodeId}`);
            if (nodeClients.size) {
                return;
            }
            const node = this.nodes.get(nodeId);
            if (node) {
                node.emit("unsubscribed");
                this.log(`unsubscribing from empty node: ${nodeId}`);
            }
        } else {
            this.log(`client ${socket.id} unable to unsubscribe from node: ${nodeId}`);
        }

        this.log(`client ${socket.id} subscribed successfuly`);
    };

    private onDisconnect = (socket: Socket) => (reason: string) => {
        super.onDisconnected(reason);
        let removed = false;
        this.clients.forEach((set, key) => {
            if (set.has(socket)) {
                set.delete(socket);
                removed = true;
                this.log(`client ${socket.id} was unsubscribed`);
                if (set.size) {
                    return;
                }
                const node = this.nodes.get(key);
                if (node) {
                    node.emit("unsubscribe");
                }
            }
        });
        if (removed) {
            return;
        }
        this.nodes.forEach((nodeSocket, key) => {
            if (nodeSocket === socket) {
                this.nodes.delete(key);
                this.log(`node ${socket.id} was unsubscribed`);
            }
        });
    };

    private onSubscribeNode = (socket: Socket) => (nodeId: number) => {
        if (this.nodes.has(nodeId)) {
            this.log(`node ${socket.id} already subscribed`);
        } else {
            this.nodes.set(nodeId, socket);
            this.log(`node ${socket.id} subscribed successfuly`);
            const nodeClients = this.clients.get(nodeId);
            if (nodeClients) {
                socket.emit("subscribe");
            }
        }
    };
    private onData = (event: IDecklinkNodeEvent) => {
        const {nodeId, data} = event;
        const nodeClients = this.clients.get(nodeId);
        if (nodeClients) {
            nodeClients.forEach((socket) => socket.emit("data", data));
        }
    };
}
