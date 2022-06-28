import {
    IDeckLinkDevice,
    IDeckLinkDeviceResponse,
    IDeckLinkDevicesResponse,
    IBmddNodeServiceSubscribeEvent,
    IBmddNodeServiceSubscribedEvent, IBmddNodeServiceErrorEvent, IBmddNodeServiceDevicesEvent,
    IBmddNodeServiceInitEvent,
} from "@socket/shared-types";
import {NodeService, NodeServiceOptions} from "@socket/shared/entities";
import {nodeUtils} from "@socket/shared-utils";

const DEVICES_LIST_COMMAND = "timeout 5 curl http://127.0.0.1:8096/api/v1/devices/";
const DEVICE_STATUS_COMMAND = (id: number) => `timeout 5 curl http://127.0.0.1:8096/api/v1/device/${id}/0/status`;

export class BmddNodeService extends NodeService {
    private pollingIntervalId: null | NodeJS.Timer;
    private deckLinkDevices: Map<number, IDeckLinkDevice>;

    constructor(name: string, nodeId: number, mainServiceUrl: string, options?: NodeServiceOptions) {
        super(name, nodeId, mainServiceUrl, options);
        this.pollingIntervalId = null;
        this.deckLinkDevices = new Map<number, IDeckLinkDevice>();
        this.registerHandler("subscribe", this.handleSubscribe.bind(this));
        this.registerHandler("unsubscribe", this.handleUnsubscribe.bind(this));
    }

    private async init() {
        try {
            const rawDevices = await nodeUtils.exec(DEVICES_LIST_COMMAND);
            const devices = JSON.parse(rawDevices) as IDeckLinkDevicesResponse;
            devices.forEach(({id}) => {
                this.deckLinkDevices.set(id, {id, status: "Init", detectedMode: "", pixelFormat: ""});
            });
            const initEvent: IBmddNodeServiceInitEvent = {
                nodeId: this.nodeId,
                devices: this.deckLinkDevices,
            };
            this.emit("init", initEvent);
        } catch (e) {
            const errorEvent: IBmddNodeServiceErrorEvent = {
                nodeId: this.nodeId,
                message: "init error",
            };
            this.emit("nodeError", errorEvent);
        }
    }

    private handleSubscribe(event: IBmddNodeServiceSubscribeEvent) {
        if (this.pollingIntervalId) {
            const subscribedEvent: IBmddNodeServiceSubscribedEvent = {
                nodeId: this.nodeId,
                clientId: event.clientId,
                devices: this.deckLinkDevices,
            };
            this.emit("subscribed", subscribedEvent);
            this.log("devices polling started");
        } else {
            const handleDevices = async () => {
                for (const id of this.deckLinkDevices.keys()) {
                    try {
                        const device = (await nodeUtils.exec(DEVICE_STATUS_COMMAND(id))) as IDeckLinkDeviceResponse;
                        this.deckLinkDevices.set(id, {
                            id,
                            status: device.status,
                            pixelFormat: device.pixel_format,
                            detectedMode: device.detected_mode,
                        });
                    } catch (e) {
                        this.log(`failed to read device status ${id}`, true);
                    }
                }
                const devicesEvent: IBmddNodeServiceDevicesEvent = {
                    nodeId: this.nodeId,
                    devices: this.deckLinkDevices,
                };
                this.emit("devices", devicesEvent);
            };
            this.pollingIntervalId = setInterval(handleDevices, 1000);
            this.log("polling started");
        }
    }

    private handleUnsubscribe() {
        if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
        this.log("polling stopped");
    }
}
