import {Socket} from "socket.io";
import {
    IMainServiceModuleDeviceCommandsEvent,
    INodeDeviceServiceCommandsResultEvent,
    IMainServiceModuleDeviceSubscribeEvent,
    INodeDeviceServiceSubscribedEvent,
    INodeBaseEvent,
    IMainServiceModuleDeviceUnsubscribeEvent,
    INodeDeviceServiceCommandsFailureEvent,
    NumericId,
    IServiceErrorBaseEvent,
    INodeDeviceServiceStatusEvent,
} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";
import {mainServiceModuleUtils, nodeServiceUtils} from "@socket/shared-utils";

export class TeranexServiceModule extends MainServiceModule {
    private nodes: Map<number, Socket>;
    private clients: Map<NumericId, Map<string, Set<Socket>>>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.nodes = new Map();
        this.clients = new Map();
    }

    protected override onConnected(socket: Socket) {
        //general events handlers
        socket.on("disconnect", this.handleDisconnect.call(this, socket));
        //node events handlers
        socket.on("init", this.handleNodeServiceInit.call(this, socket));
        socket.on("status", this.handleNodeServiceDeviceStatus.bind(this));
        socket.on("subscribed", this.handleNodeServiceSubscribed.bind(this));
        socket.on("result", this.handleNodeServiceCommandsResult.bind(this));
        socket.on("failure", this.handleNodeServiceCommandsFailure.bind(this));
        socket.on("serviceError", this.handleNodeServiceError.bind(this));
        //clients events handlers
        socket.on("subscribe", this.handleSubscribe.call(this, socket));
        socket.on("unsubscribe", this.handleUnsubscribe.call(this, socket));
        socket.on("commands", this.handleCommands.call(this, socket));
    }

    //general events handlers
    private handleDisconnect(socket: Socket) {
        return (reason: string) => {
            this.log(`disconnect event received for client ${socket.id} because of ${reason}`);
            let cleared = false;
            //first we would try to test disconnected socket against nodes sockets
            for (const nodeId of this.nodes.keys()) {
                if (this.nodes.get(nodeId)?.id === socket.id) {
                    this.log(`disconnected client ${socket.id} appears to be a node client`);
                    this.nodes.delete(nodeId);
                    cleared = true;
                    break;
                }
            }
            //if it wasn't a node socket lets try to clean up clients map
            if (!cleared) {
                for (const nodeId of this.clients.keys()) {
                    const nodeDevicesMap = this.clients.get(nodeId);
                    if (nodeDevicesMap?.size) {
                        for (const deviceId of nodeDevicesMap.keys()) {
                            if (nodeDevicesMap.get(deviceId)?.has(socket)) {
                                this.log(
                                    `disconnected client ${socket.id} appears to be subscribed to ${nodeId}/${deviceId}`
                                );
                                nodeDevicesMap.get(deviceId)?.delete(socket);
                                //todo: stop device in case of no subscribers
                            }
                        }
                    }
                }
            }
        };
    }

    //node events handlers
    private handleNodeServiceInit(socket: Socket) {
        return (event: INodeBaseEvent) => {
            if (nodeServiceUtils.testNodeDeviceServiceInitEvent(event)) {
                this.log(`node ${event.nodeId} service initialized`);
                this.nodes.set(event.nodeId, socket);
                const nodeClients = this.clients.get(event.nodeId);
                if (nodeClients && nodeClients.size) {
                    this.log(`node ${event.nodeId} service handling pending subscriptions`);
                    nodeClients.forEach((clients, deviceId) => {
                        const [ip, port] = deviceId.split(":");
                        clients.forEach((client) => {
                            const reconstructedEvent: IMainServiceModuleDeviceSubscribeEvent = {
                                nodeId: event.nodeId,
                                ip,
                                port: Number.parseInt(port),
                            };
                            socket.emit("subscribe", {clientId: client.id, origin: reconstructedEvent});
                        });
                    });
                }
            } else {
                this.log(`node service ${socket.id} malformed initialized event`, true);
            }
        };
    }

    private handleNodeServiceDeviceStatus(socket: Socket) {
        return (event: INodeDeviceServiceStatusEvent) => {
            if (nodeServiceUtils.testNodeDeviceServiceStatusEvent(event)) {
                const deviceId = `${event.ip}:${event.port}`;
                this.log(`node ${event.nodeId} device ${deviceId} status changed to ${event.online}`);
                const nodeClients = this.clients.get(event.nodeId);
                if (nodeClients && nodeClients.size) {
                    const deviceClients = nodeClients.get(deviceId);
                    if (deviceClients && deviceClients.size) {
                        deviceClients.forEach((socket) => socket.emit("status", event));
                        this.log(
                            `node ${event.nodeId} device ${deviceId} status sent to ${deviceClients.size} subscribers`
                        );
                    }
                }
            } else {
                this.log(`node service ${socket.id} malformed status event`, true);
            }
        };
    }

    private handleNodeServiceSubscribed(event: INodeDeviceServiceSubscribedEvent) {
        if (nodeServiceUtils.testNodeDeviceServiceSubscribedEvent(event)) {
            const {clientId, origin} = event;
            this.log(`subscribed event received for ${clientId} from ${nodeServiceUtils.eventToString(event.origin)}`);
            const client = this.getClientById(clientId);
            if (client) {
                client.emit("subscribed", origin);
            }
        } else {
            this.log(`node service malformed subscribed event`, true);
        }
    }

    private handleNodeServiceCommandsResult(event: INodeDeviceServiceCommandsResultEvent) {
        if (nodeServiceUtils.testNodeDeviceServiceCommandsResultEvent(event)) {
            const {ip, port, nodeId} = event;
            const deviceId = `${ip}:${port}`;
            const clients = this.clients.get(nodeId)?.get(deviceId);
            clients?.forEach((socket) => socket.emit("result", event));
            this.log(
                `sending command result from ${nodeServiceUtils.eventToString(event)} to ${
                    clients?.size || 0
                } subscribers`
            );
        } else {
            this.log(`node service malformed result event`, true);
        }
    }

    private handleNodeServiceCommandsFailure(event: INodeDeviceServiceCommandsFailureEvent) {
        if (nodeServiceUtils.testNodeDeviceServiceCommandsFailureEvent(event)) {
            const {origin, clientId, error} = event;
            const client = this.getClientById(clientId);
            if (client) {
                client.emit("serviceError", {request: "commands", message: error});
            }
            this.log(`sending command failure result from ${nodeServiceUtils.eventToString(origin)} to ${clientId}`);
        } else {
            this.log(`node service malformed failure event`, true);
        }
    }

    private handleNodeServiceError(event: IServiceErrorBaseEvent) {
        //todo: pass it to the client
    }

    //clients events handlers
    private handleSubscribe(socket: Socket) {
        return (event: IMainServiceModuleDeviceSubscribeEvent) => {
            if (mainServiceModuleUtils.testMainServiceModuleDeviceSubscribeEvent(event)) {
                const {nodeId, ip, port} = event;
                const deviceId = `${ip}:${port}`;
                this.log(`client ${socket.id} subscribing to ${nodeServiceUtils.eventToString(event)}`);
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
                    this.nodes.get(nodeId)?.emit("subscribe", {clientId: socket.id, origin: event});
            } else {
                this.log(`client ${socket.id} subscribe event malformed`);
                socket.emit("serviceError", {request: "subscribe", message: "malformed event"});
            }
        };
    }

    private handleUnsubscribe(socket: Socket) {
        return (event: IMainServiceModuleDeviceUnsubscribeEvent) => {
            if (mainServiceModuleUtils.testMainServiceModuleDeviceUnsubscribeEvent(event)) {
                const {ip, port, nodeId} = event;
                const deviceId = `${ip}:${port}`;
                this.log(`client ${socket.id} unsubscribing from ${nodeServiceUtils.eventToString(event)}`);
                const nodeSubscribers = this.clients.get(nodeId);
                if (nodeSubscribers && nodeSubscribers.has(deviceId)) {
                    nodeSubscribers.get(deviceId)?.delete(socket);
                }
            } else {
                this.log(`client ${socket.id} unsubscribe event malformed`);
                socket.emit("serviceError", {request: "unsubscribe", message: "malformed event"});
            }
        };
    }

    private handleCommands(socket: Socket) {
        return (event: IMainServiceModuleDeviceCommandsEvent) => {
            if (mainServiceModuleUtils.testMainServiceModuleDeviceCommandsEvent(event)) {
                const {nodeId, commands} = event;
                const nodeSocket = this.nodes.get(nodeId);
                if (nodeSocket) {
                    this.log(`commands ${commands} event for ${nodeServiceUtils.eventToString(event)}`);
                    nodeSocket.emit("commands", event);
                }
            } else {
                this.log(`client commands event malformed`);
                socket.emit("serviceError", {request: "subscribe", message: "malformed event"});
            }
        };
    }
}
