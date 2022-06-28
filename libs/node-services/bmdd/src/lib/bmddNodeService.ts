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

const DEVICES_LIST_COMMAND = "timeout 60 curl http://127.0.0.1:8096/api/v1/devices/";
const DEVICE_STATUS_COMMAND = (id: number) => `timeout 30 curl http://127.0.0.1:8096/api/v1/device/${id}/0/status`;

export class BmddNodeService extends NodeService {
    private initialized: boolean;
    private pollingIntervalId: null | NodeJS.Timer;
    private deckLinkDevices: {[id: number]: IDeckLinkDevice};

    constructor(name: string, nodeId: number, mainServiceUrl: string, options?: NodeServiceOptions) {
        super(name, nodeId, mainServiceUrl, options);
        this.initialized = false;
        this.pollingIntervalId = null;
        this.deckLinkDevices = {};
        this.init = this.init.bind(this);
        this.registerHandler("subscribe", this.handleSubscribe.bind(this));
        this.registerHandler("unsubscribe", this.handleUnsubscribe.bind(this));
    }

    protected override onConnected() {
        super.onConnected();
        this.init();
    }

    private async init() {
        try {
            const rawDevices = await nodeUtils.exec(DEVICES_LIST_COMMAND);
            const devices = JSON.parse(rawDevices) as IDeckLinkDevicesResponse;
            this.log(`devices ${rawDevices} ${devices.map(i => i.id)}`)
            devices.forEach((device) => {
                this.log(`device ${JSON.stringify(device)}`);
                this.deckLinkDevices[device.id] = {id: device.id, status: "Init", detectedMode: "", pixelFormat: ""};
            });
            const initEvent: IBmddNodeServiceInitEvent = {
                nodeId: this.nodeId,
                devices: this.deckLinkDevices,
            };
            this.emit("init", initEvent);
            this.initialized = true;
        } catch (e) {
            this.log("failed to init service");
            const errorEvent: IBmddNodeServiceErrorEvent = {
                nodeId: this.nodeId,
                message: "init error",
            };
            this.emit("nodeError", errorEvent);
        }
    }

    private handleSubscribe(event: IBmddNodeServiceSubscribeEvent) {
        if (this.initialized) {
            this.log(`handling subscribe event from ${event.clientId}`);
        } else {
            this.log(`got subscribe event from ${event.clientId}, but service was not initialized, rejecting with error`);
            const errorEvent: IBmddNodeServiceErrorEvent = {
                nodeId: this.nodeId,
                message: "not initialized",
            };
            this.emit("nodeError", errorEvent);
        }
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
                for (const deviceId of Object.keys(this.deckLinkDevices)) {
                    const id = parseInt(deviceId, 10);
                    try {
                        const rawDevice = (await nodeUtils.exec(DEVICE_STATUS_COMMAND(id)));
                        const device = JSON.parse(rawDevice) as IDeckLinkDeviceResponse;
                        this.log(`device ${JSON.stringify(device)}`);
                        this.deckLinkDevices[id] = {
                            id,
                            status: device.status,
                            pixelFormat: device.pixel_format,
                            detectedMode: device.detected_mode,
                        };
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
            this.pollingIntervalId = setInterval(handleDevices, 20000);
            this.log("polling started");
        }
    }

    private handleUnsubscribe() {
        if (this.initialized) {
            this.log(`handling unsubscribe event`);
        } else {
            this.log(`got unsubscribe event, but service was not initialized, rejecting with error`);
            const errorEvent: IBmddNodeServiceErrorEvent = {
                nodeId: this.nodeId,
                message: "not initialized",
            };
            this.emit("nodeError", errorEvent);
        }
        if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
        this.log("polling stopped");
    }
}
