import {IClientCmdRequestEvent, IDeviceResponseEvent} from "@socket/shared-types";
import {HyperdeckDevice} from "./device";
import {IHyperdeckDevices} from "./types";
import {NodeService} from "@socket/shared/entities";

export class TeranexNodeService extends NodeService {
    private devices: IHyperdeckDevices = {};

    private async handleRequest(data: IClientCmdRequestEvent) {
        const {ip, port, commands} = data;
        const deviceId = `${ip}:${port}`;
        const device = await this.getDevice(deviceId);
        try {
            if (!device) {
                this.log("Device is null", true);
                this.emit("response", {
                    nodeId: this.nodeId,
                    ip,
                    port,
                    error: "Device is null",
                } as IDeviceResponseEvent);
                return;
            }

            if (device.busy) {
                this.log("Device is busy", true);
                this.emit("response", {
                    nodeId: this.nodeId,
                    ip,
                    port,
                    error: "Device is busy",
                } as IDeviceResponseEvent);
                return;
            }

            device.busy = true;
            const data = [];
            for (const cmd of commands) {
                data.push(await device.command(cmd));
            }
            device.busy = false;

            this.log("Response was sended");
            this.emit("response", {
                nodeId: this.nodeId,
                ip,
                port,
                data,
            } as IDeviceResponseEvent);
        } catch (e: any) {
            let error;
            if (e.code === "ECONNREFUSED") {
                error = "Device is unavailable";
            } else if (e.message === "timeout") {
                error = "Device timeout";
            } else {
                error = "Device unknown error";
            }
            this.log(error, true);
            this.emit("response", {
                nodeId: this.nodeId,
                ip,
                port,
                error,
            } as IDeviceResponseEvent);
        }
    }

    async getDevice(deviceId: string): Promise<HyperdeckDevice | null> {
        if (this.devices[deviceId]) {
            return this.devices[deviceId];
        }
        try {
            const [ip, port] = deviceId.split(":");
            const device = new HyperdeckDevice(ip, parseInt(port));
            await device.connect();
            await device.command("ping\r\n");
            this.devices[deviceId] = device;
        } catch (e) {
            this.log(`Can not get. Device ${deviceId} is: ${this.devices[deviceId]}`, true);
            this.devices[deviceId] = null;
        }
        return this.devices[deviceId];
    }
}
