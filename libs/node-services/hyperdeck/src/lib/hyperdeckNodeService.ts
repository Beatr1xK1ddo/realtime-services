import {
    IClientCmdRequestEvent,
    IClientSubscribeEvent,
    IDeviceResponseError,
    IDeviceResponseEvent,
} from "@socket/shared-types";
import {Device, NodeDeviceService, NodeServiceOptions} from "@socket/shared/entities";

export class HyperdeckNodeService extends NodeDeviceService {
    constructor(
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        super(name, nodeId, mainServiceUrl, options);
        this.registerHandler("subscribe", this.handleSubscription.bind(this));
        this.registerHandler("request", this.handleRequest.bind(this));
    }

    protected override onConnected() {
        super.onConnected();
        this.emit("init", {nodeId: this.nodeId});
    }

    private async handleSubscription(event: {socketId: string; event: IClientSubscribeEvent}) {
        const {ip, port} = event.event;
        try {
            const device = await this.getDevice(ip, port);
            if (device) {
                this.emit("subscribed", event);
            }
        } catch (error) {
            this.emit("subscriptionError", {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseError);
        }
    }

    private async handleRequest(data: IClientCmdRequestEvent) {
        const {ip, port, commands} = data;
        try {
            const device = await this.getDevice(ip, port);

            const data = [];
            for (const cmd of commands) {
                data.push(await device.sendCommand(cmd));
            }

            this.log(`Commands processed ${JSON.stringify(data)}`);
            this.emit("response", {
                nodeId: this.nodeId,
                ip,
                port,
                data,
            } as IDeviceResponseEvent);
        } catch (error) {
            this.emit("subscriptionError", {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseError);
        }
    }

    async getDevice(ip: string, port: number): Promise<Device> {
        const deviceId = `${ip}:${port}`;
        if (this.devices[deviceId] && !this.devices[deviceId].check) {
            return this.devices[deviceId];
        }
        const device = await HyperdeckNodeService.createDevice(ip, port);

        if (!device) {
            this.log(`Can't create device ${deviceId}`, true);
            throw new Error(`Can't create device ${deviceId}`);
        }
        this.devices[deviceId] = device;
        return this.devices[deviceId];
    }

    private static async createDevice(ip: string, port: number): Promise<Device | null> {
        try {
            const device = new Device(ip, port);
            await device.connect();
            await device.sendCommand("ping\r\n");
            return device;
        } catch (e) {
            console.log("start catch");
            return null;
        }
    }
}
