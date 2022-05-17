import fetch from "node-fetch";
import {
    IClientSubscribeEvent,
    IDecklinkClientEvent,
    IDecklinkDeviceState,
    IDecklinkLiveMonitor,
    IDecklinkState,
    isIDecklinkClientEvent,
} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";
import {Socket} from "socket.io";

export class DecklinkLiveMonitor extends MainServiceModule {
    private clients: Map<number, IDecklinkState>;

    constructor(name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.clients = new Map();
    }

    protected override onConnected(socket: Socket): void {
        super.onConnected(socket);
        socket.on("clientSubscribe", this.onClientSubscribe(socket));
        socket.on("clientUnsubscribe", this.onClientUnsubscribe(socket));
        socket.on("sendMessage", this.hadleDeviceMessage.bind(this));
    }

    private hadleDeviceMessage(message: IDecklinkLiveMonitor) {
        const {id} = message;
        const deviceClients = this.clients?.get(id)?.sockets;
        if (deviceClients?.size) {
            deviceClients.forEach((socket) => socket.emit("deviceMessage", message));
        }
    }

    private onClientSubscribe(socket: Socket) {
        return async (event: IDecklinkClientEvent) => {
            const shouldProcess = isIDecklinkClientEvent(event);

            if (!shouldProcess) {
                socket.emit("subscribeError", {
                    request: "subscribe",
                    message: "bad request",
                });
                return;
            }
            const {devidePortId} = event;
            const response = await this.getSingleDecklikDevices(devidePortId);

            if (!response) {
                socket.emit("subscribeError", {
                    request: "subscribe",
                    message: `Can not get device with deviceId ${event.devidePortId}`,
                });
                this.log(`Can not get device with deviceId ${event.devidePortId}`);
                return;
            }

            if (!this.clients.has(devidePortId)) {
                this.clients.set(devidePortId, {sockets: new Set([socket]), deviceState: response});
            } else {
                this.clients.get(devidePortId)?.sockets.add(socket);
            }

            if (this.clients.size === 1) {
                this.getListDecklikDevices();
            }
        };
    }

    private onClientUnsubscribe(socket: Socket) {
        return (data: IDecklinkClientEvent) => {
            const {devidePortId} = data;
            if (!this.clients.has(devidePortId)) {
                this.log(`DecklinkLiveMonitor has no device with device por id ${devidePortId}`);
                return;
            }

            this.clients.get(devidePortId)?.sockets.delete(socket);

            if (!this.clients.get(devidePortId)?.sockets.size) {
                this.clients.delete(devidePortId);
            }

            this.log(`Socket: "${socket.id}" unsubscribed from device port id: ${devidePortId}`);
        };
    }

    private async getListDecklikDevices() {
        try {
            const response = await fetch("http://127.0.0.1:8096/api/v1/devices/status");
            const cleanResponse: IDecklinkLiveMonitor[] = await response.json();
            console.log("cleanResponse", cleanResponse);
        } catch (erros) {
            console.log("erros", erros);
        }
    }

    private async getSingleDecklikDevices(devidePortId: number): Promise<IDecklinkLiveMonitor | undefined> {
        try {
            const response = await fetch(`http://127.0.0.1:8096/api/v1/device/${devidePortId}/0/status`);
            const cleanResponse: IDecklinkLiveMonitor = await response.json();
            return cleanResponse;
        } catch (erros) {
            console.log("erros", erros);
            return;
        }
    }
}
