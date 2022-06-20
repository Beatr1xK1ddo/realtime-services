import {
    IMainServiceModuleDeviceCommandsEvent,
    IMainServiceModuleDeviceSubscribeEvent,
    INodeDeviceServiceCommandsFailureEvent,
    INodeDeviceServiceCommandsResultEvent,
    INodeDeviceServiceSubscribedEvent,
    IServiceErrorBaseEvent,
    StringId,
} from "@socket/shared-types";
import {Device, NodeDeviceService, NodeServiceOptions} from "@socket/shared/entities";

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
        try {
            const device = await this.getDevice(ip, port);
            const subscribedEvent: INodeDeviceServiceSubscribedEvent = {
                clientId: event.clientId,
                origin: event.origin,
            };
            if (device) this.emit("clientSubscribed", subscribedEvent);
        } catch (error) {
            const errorEvent: IServiceErrorBaseEvent = {
                request: "subscribe",
                message: error,
            };
            this.emit("serviceError", errorEvent);
        }
    }

    private async handleCommands(event: IMainServiceModuleDeviceCommandsEvent) {
        const {nodeId, ip, port, commands} = event;
        try {
            const device = await this.getDevice(ip, port);
            if (device) {
                const result = [];
                for (const command of commands) {
                    const commandResult = await device.sendCommand(command);
                    result.push(TeranexNodeService.format(commandResult));
                }
                this.log(`commands processed ${result}`);
                const resultEvent: INodeDeviceServiceCommandsResultEvent = {
                    nodeId,
                    ip,
                    port,
                    data: result,
                };
                this.emit("result", resultEvent);
            }
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

    private async getDevice(ip: string, port: number): Promise<Device> {
        const deviceId = `${ip}:${port}`;
        if (this.devices[deviceId]) {
            return this.devices[deviceId];
        }
        const newDevice = await TeranexNodeService.createDevice(ip, port);
        if (!newDevice) {
            this.log(`can't create device ${deviceId}`, true);
            return null;
        }
        this.devices[deviceId] = newDevice;
        return this.devices[deviceId];
    }

    private static async createDevice(ip: string, port: number): Promise<Device | null> {
        try {
            const device = new Device(ip, port, {debounceDelay: 300});
            await device.connect();
            await device.sendCommand("ping\r\n");
            return device;
        } catch (e) {
            return null;
        }
    }

    private static format(str: string) {
        return str.replace(/\n\n/g, "\n").replace(/ACK\n/, "");
    }
}
