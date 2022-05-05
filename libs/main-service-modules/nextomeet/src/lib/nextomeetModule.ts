import {
    IClientNextomeetResEvent,
    IMainServiceModule,
    INodeInitEvent,
    IClientNextomeetReqEvent,
    IClientNextomeetSubEvent,
    IPinoOptions,
} from "@socket/shared-types";
import {PinoLogger} from "@socket/shared-utils";
import {Namespace, Socket} from "socket.io";

export class NextomeetModule implements IMainServiceModule {
    private io?: Namespace;
    public name: string;
    private nodes: Map<number, Socket>;
    private clients: Map<number, Set<Socket>>;
    private logger: PinoLogger;

    constructor(name: string, loggerOptions?: Partial<IPinoOptions>) {
        this.name = name;
        this.nodes = new Map();
        this.clients = new Map();
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
    }

    init(io: Namespace) {
        this.io = io;
        this.io.on("connection", this.handleConnection.bind(this));
    }

    private handleConnection(socket: Socket) {
        socket.on("init", ({nodeId}: INodeInitEvent) => {
            this.logger.log.info(`Init node: ${nodeId}`);
            this.nodes.set(nodeId, socket);
        });
        socket.on("subscribe", ({nodeId}: IClientNextomeetSubEvent) => {
            if (!this.clients.has(nodeId)) {
                const nodeSubscribers = new Map();
                nodeSubscribers.set(nodeId, new Set([socket]));
            } else {
                this.clients.get(nodeId)?.add(socket);
            }
            this.logger.log.info(`Socket: "${socket.id}" subscribed to node: "${nodeId}"`);
        });
        socket.on("unsubscribe", ({nodeId}: IClientNextomeetSubEvent) => {
            const devicesSubscribers = this.clients.get(nodeId);
            this.logger.log.info(`Socket: "${socket.id}" unsubscribed from node: "${nodeId}"`);
            if (!devicesSubscribers) {
                return;
            }
            devicesSubscribers.delete(socket);
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
