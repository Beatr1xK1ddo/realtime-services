import {
    IMainServiceModuleDeviceCommandsEvent,
    IMainServiceModuleDeviceSubscribeEvent,
    INodeDeviceServiceCommandsFailureEvent,
    INodeDeviceServiceCommandsResultEvent,
    INodeDeviceServiceStatusEvent,
    INodeDeviceServiceSubscribedEvent,
    INodeServiceCommonFaultEvent,
    IServiceCommonFaultOrigin,
    IServiceCommonFaultType,
    StringId,
} from "@socket/shared-types";
import {Device, NodeDeviceService, NodeServiceOptions} from "@socket/shared/entities";
import {nodeServiceUtils} from "@socket/shared-utils";

export class TeranexNodeService extends NodeDeviceService {
    constructor(name: string, nodeId: number, mainServiceUrl: string, options?: NodeServiceOptions) {
        super(name, nodeId, mainServiceUrl, options);
        this.registerHandler("subscribe", this.handleSubscribe.bind(this));
        this.registerHandler("commands", this.handleCommands.bind(this));
    }

    protected onConnected() {
        super.onConnected();
        this.emit("init", {nodeId: this.nodeId});
    }

    private async handleSubscribe(event: {clientId: StringId; origin: IMainServiceModuleDeviceSubscribeEvent}) {
        const {ip, port} = event.origin;
        this.log(`client ${event.clientId} subscribing to ${nodeServiceUtils.eventToString(event.origin)}`);
        try {
            await this.getDevice(ip, port);
            const subscribedEvent: INodeDeviceServiceSubscribedEvent = {
                clientId: event.clientId,
                origin: event.origin,
            };
            this.emit("subscribed", subscribedEvent);
        } catch (error) {
            this.log(`client ${event.clientId} subscribe fault ${error}`);
            const faultEvent: INodeServiceCommonFaultEvent = {
                nodeId: this.nodeId,
                origin: IServiceCommonFaultOrigin.node,
                type: IServiceCommonFaultType.event,
                event: "subscribe",
            };
            this.emit("serviceError", faultEvent);
        }
    }

    private async handleCommands(event: IMainServiceModuleDeviceCommandsEvent) {
        const {nodeId, ip, port, commands} = event;
        this.log(`commands ${commands} received for ${ip}:${port}`);
        try {
            const device = await this.getDevice(ip, port);
            const result = [];
            for (const command of commands) {
                const commandResult = await device.sendCommand(command);
                result.push(TeranexNodeService.format(commandResult));
            }
            this.log(`commands ${commands} processed by ${ip}:${port}`);
            const resultEvent: INodeDeviceServiceCommandsResultEvent = {
                nodeId,
                ip,
                port,
                data: result,
            };
            this.emit("result", resultEvent);
        } catch (error) {
            //todo: fix this clientId
            const failureEvent: INodeDeviceServiceCommandsFailureEvent = {
                clientId: "0",
                origin: event,
                error,
            };
            this.emit("failure", failureEvent);
        }
    }

    private handleDeviceOnlineStatusChanged(ip: string, port: number): (online: boolean) => void {
        return (online: boolean) => {
            const event: INodeDeviceServiceStatusEvent = {nodeId: this.nodeId, ip, port, online};
            this.emit("status", event);
        };
    }

    private getDevice(ip: string, port: number): Device {
        const deviceId = `${ip}:${port}`;
        if (!this.devices[deviceId]) {
            this.log(`creating device ${deviceId}`);
            this.devices[deviceId] = new Device(ip, port, {
                debounceDelay: 300,
                onOnlineStatusChanged: this.handleDeviceOnlineStatusChanged(ip, port),
            }).connect();
        }
        this.log(`device ${deviceId} obtained`);
        return this.devices[deviceId];
    }

    private static format(str: string) {
        return str.replace(/\n\n/g, "\n").replace(/ACK\n/, "");
    }
}
