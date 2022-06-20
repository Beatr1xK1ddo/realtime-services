import {IClientNextomeetResEvent, INodeBaseEvent, IClientNextomeetReqEvent} from "@socket/shared-types";
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
        socket.on("nodeServiceInit", this.onNodeServiceInit.call(this, socket));
        socket.on("clientSubscribe", this.onClientSubscribe.call(this, socket));
        socket.on("clientUnsubscribe", this.onClientUnsubscribe.call(this, socket));
        socket.on("clientResponse", this.onClientResponse.bind(this));
        socket.on("clientCommands", this.onClientCommands.bind(this));
        socket.on("error", this.onError.bind(this));
    }

    private onNodeServiceInit(socket: Socket) {
        return ({nodeId}: INodeBaseEvent) => {
            this.log(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        };
    }

    private onClientSubscribe(socket: Socket) {
        return ({nodeId}: INodeBaseEvent) => {
            if (!this.clients.has(nodeId)) {
                this.clients.set(nodeId, new Set([socket]));
            } else if (!this.clients.get(nodeId)?.has(socket)) {
                this.clients.get(nodeId)?.add(socket);
            }
            this.logger.log.info(`Socket: "${socket.id}" subscribed to node: "${nodeId}"`);
        };
    }

    private onClientUnsubscribe(socket: Socket) {
        return ({nodeId}: INodeBaseEvent) => {
            const devicesSubscribers = this.clients.get(nodeId);
            if (!devicesSubscribers) {
                return;
            }
            devicesSubscribers.delete(socket);
            this.log(`Socket: "${socket.id}" unsubscribed from node: "${nodeId}"`);
        };
    }

    private onClientResponse(data: IClientNextomeetResEvent) {
        const {nodeId} = data;
        this.clients.get(nodeId)?.forEach((socket) => socket.emit("result", data));
        this.logger.log.info(`Response was sent to clients with node: "${nodeId}"`);
    }

    private onClientCommands(data: IClientNextomeetReqEvent) {
        const {nodeId} = data;
        const nodeSocket = this.nodes.get(nodeId);
        if (nodeSocket) {
            this.logger.log.info(`Commands to node: "${nodeId}" requested to device`);
            nodeSocket.emit("request", data);
        }
    }
}
