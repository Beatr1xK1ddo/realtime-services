import {
    IClientCmdRequestEvent,
    IClientSubscribeEvent,
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

    private async handleSubscription(event: {socketId: string; event: IClientSubscribeEvent}) {
        const {ip, port} = event.event;
        try {
            const device = await this.getDevice(ip, port);
            if (device) this.emit("subscribed", event);
        } catch (e) {
            //todo: add subscription failure handling
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
            this.emit("response", {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseEvent);
        }
    }

    async getDevice(ip: string, port: number): Promise<Device> {
        const deviceId = `${ip}:${port}`;
        if (this.devices?.[deviceId]) {
            return this.devices?.[deviceId];
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
            device.connect();
            await device.sendCommand("ping\r\n");
            return device;
        } catch (e) {
            return null;
        }
    }
}
