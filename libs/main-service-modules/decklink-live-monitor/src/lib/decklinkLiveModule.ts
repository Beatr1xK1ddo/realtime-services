import fetch from "node-fetch";
import {IDecklinkClientEvent, IDecklinkLiveMonitor, IDecklinkState, isIDecklinkClientEvent} from "@socket/shared-types";
import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";
import {Socket} from "socket.io";

export class DecklinkLiveMonitor extends MainServiceModule {
    private clients: Map<number, IDecklinkState>;
    private timer?: NodeJS.Timer;
    private timeout?: number;

    constructor(name: string, timeout?: number, options?: MainServiceModuleOptions) {
        super(name, options);
        this.clients = new Map();
        this.timeout = timeout;
    }

    protected override onConnected(socket: Socket): void {
        super.onConnected(socket);
        socket.on("clientSubscribe", this.onClientSubscribe(socket));
        socket.on("clientUnsubscribe", this.onClientUnsubscribe(socket));
    }

    private initTimeoutRequest() {
        this.timer = setInterval(async () => {
            const decklinkList = await this.getListDecklikDevices();
            if (!decklinkList) {
                this.log("Can not get decklink list");
                return;
            }

            for (const devidePortId of this.clients.keys()) {
                const decklink = decklinkList.find((item) => item.id === devidePortId);

                if (!decklink) {
                    continue;
                }

                this.hadleDeviceMessage(decklink);
            }
        }, this.timeout || 5000);
    }

    private hadleDeviceMessage(message: IDecklinkLiveMonitor) {
        const {id} = message;
        const deviceState = this.clients?.get(id);
        if (deviceState?.sockets.size) {
            deviceState.deviceState = message;
            deviceState.sockets.forEach((socket) => {
                socket.emit("deviceMessage", message);
            });
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
                this.initTimeoutRequest();
            }

            if (!this.clients.size && this.timer) {
                clearInterval(this.timer);
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

    private async getListDecklikDevices(): Promise<IDecklinkLiveMonitor[] | undefined> {
        try {
            const response = await fetch("http://127.0.0.1:8096/api/v1/devices/status");
            const cleanResponse: IDecklinkLiveMonitor[] = await response.json();
            return cleanResponse;
        } catch (erros) {
            console.log("erros", erros);
            return;
        }
    }

    private async getSingleDecklikDevices(devidePortId: number): Promise<IDecklinkLiveMonitor | undefined> {
        try {
            const response = await fetch(`http://127.0.0.1:8096/api/v1/device/${devidePortId}/0/status`);
            const cleanResponse: IDecklinkLiveMonitor = await response.json();
            return cleanResponse;
        } catch (error) {
            console.log("erros", error);
            return;
        }
    }
}
