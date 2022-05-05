import {
    IClientNextomeetResEvent,
    INodeInitEvent,
    IClientNextomeetReqEvent,
    IClientNextomeetSubEvent,
} from "@socket/shared-types";
import {Socket} from "socket.io";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";

export class NextomeetModule extends MainServiceModule {
    private nodes: Map<number, Socket>;
    private clients: Map<number, Set<Socket>>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.nodes = new Map();
        this.clients = new Map();
    }
    protected override onConnected(socket: Socket) {
        socket.on("init", ({nodeId}: INodeInitEvent) => {
            this.logger.log.info(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        });
        socket.on("subscribe", ({nodeId}: IClientNextomeetSubEvent) => {
            if (!this.clients.has(nodeId)) {
                this.clients.set(nodeId, new Set([socket]));
            } else if (!this.clients.get(nodeId)?.has(socket)) {
                this.clients.get(nodeId)?.add(socket);
            }
            this.logger.log.info(`Socket: "${socket.id}" subscribed to node: "${nodeId}"`);
        });
        socket.on("unsubscribe", ({nodeId}: IClientNextomeetSubEvent) => {
            const devicesSubscribers = this.clients.get(nodeId);
            if (!devicesSubscribers) {
                return;
            }
            devicesSubscribers.delete(socket);
            this.logger.log.info(`Socket: "${socket.id}" unsubscribed from node: "${nodeId}"`);
        });
        socket.on("commands", (data: IClientNextomeetReqEvent) => {
            const {nodeId} = data;
            const nodeSocket = this.nodes.get(nodeId);
            if (nodeSocket) {
                this.logger.log.info(`Commands to node: "${nodeId}" requested to device`);
                nodeSocket.emit("request", data);
            }
        });
        socket.on("response", (data: IClientNextomeetResEvent) => {
            const {nodeId} = data;
            this.clients.get(nodeId)?.forEach((socket) => socket.emit("result", data));
            this.logger.log.info(`Response was sent to clients with node: "${nodeId}"`);
        });
        socket.on("error", (error) => this.logger.log.error("Socket error", error));
    }
}
