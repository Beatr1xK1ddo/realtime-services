import {
    IBmddNodeServiceDevicesEvent,
    IBmddNodeServiceInitEvent,
    IBmddNodeServiceSubscribedEvent,
    IBmddNodeServiceSubscribeEvent,
    IDeckLinkDevice,
    IDeckLinkDeviceResponse,
    IDeckLinkDevicesResponse,
    INodeServiceCommonFaultEvent,
    IServiceCommonFaultOrigin,
    IServiceCommonFaultType,
    StringId,
} from "@socket/shared-types";
import {NodeService, NodeServiceOptions} from "@socket/shared/entities";
import {nodeUtils} from "@socket/shared-utils";

const DEVICES_LIST_COMMAND = "curl http://127.0.0.1:8096/api/v1/devices/";
const DEVICE_STATUS_COMMAND = (id: number) => `curl http://127.0.0.1:8096/api/v1/device/${id}/0/status`;
/*
const DEVICES_LIST_COMMAND = "timeout 60 curl http://127.0.0.1:8096/api/v1/devices/";
const DEVICE_STATUS_COMMAND = (id: number) => `timeout 30 curl http://127.0.0.1:8096/api/v1/device/${id}/0/status`;
*/

export class BmddNodeService extends NodeService {
    private initialized: boolean;
    private pollingIntervalId: null | NodeJS.Timer;
    private deckLinkDevices: Map<number, IDeckLinkDevice>;

    constructor(name: string, nodeId: number, mainServiceUrl: string, options?: NodeServiceOptions) {
        super(name, nodeId, mainServiceUrl, options);
        this.initialized = false;
        this.pollingIntervalId = null;
        this.deckLinkDevices = new Map<number, IDeckLinkDevice>();
        this.registerHandler("subscribe", this.handleSubscribe.bind(this));
        this.registerHandler("unsubscribe", this.handleUnsubscribe.bind(this));
    }

    protected override onConnected() {
        super.onConnected();
        this.init();
    }

    protected override onDisconnected(reason: string) {
        super.onDisconnected(reason);
        this.handleUnsubscribe();
    }

    private async init() {
        try {
            const rawDevices = await nodeUtils.exec(DEVICES_LIST_COMMAND);
            this.log(`DeckLink devices ${rawDevices}`);
            const devices = JSON.parse(rawDevices) as IDeckLinkDevicesResponse;
            devices.forEach((device) => {
                this.deckLinkDevices.set(device.id, {id: device.id, status: "Init", detectedMode: "", pixelFormat: ""});
            });
            const initEvent: IBmddNodeServiceInitEvent = {
                nodeId: this.nodeId,
                devices: Object.fromEntries(this.deckLinkDevices),
            };
            this.emit("init", initEvent);
            this.initialized = true;
        } catch (e) {
            this.log("service initialization fault");
            const faultEvent: INodeServiceCommonFaultEvent = {
                nodeId: this.nodeId,
                origin: IServiceCommonFaultOrigin.node,
                type: IServiceCommonFaultType.init,
            };
            this.emit("fault", faultEvent);
        }
    }

    private handleSubscribed(clientId: StringId) {
        this.log(`emitting subscribed event for ${clientId}`);
        const subscribedEvent: IBmddNodeServiceSubscribedEvent = {
            nodeId: this.nodeId,
            clientId,
            devices: Object.fromEntries(this.deckLinkDevices),
        };
        this.emit("subscribed", subscribedEvent);
    }

    private handleSubscribe(event: IBmddNodeServiceSubscribeEvent) {
        if (this.initialized) {
            this.log(`handling subscribe from ${event.clientId}`);
        } else {
            this.log(
                `got subscribe event from ${event.clientId}, but service was not initialized, emitting service fault`,
                true
            );
            const faultEvent: INodeServiceCommonFaultEvent = {
                nodeId: this.nodeId,
                origin: IServiceCommonFaultOrigin.node,
                type: IServiceCommonFaultType.event,
                event: "subscribe",
                message: "service not initialized",
            };
            this.emit("fault", faultEvent);
            return;
        }
        if (this.pollingIntervalId) {
            this.handleSubscribed(event.clientId);
        } else {
            const handleDevices = async () => {
                for (const id of this.deckLinkDevices.keys()) {
                    try {
                        const rawDevice = await nodeUtils.exec(DEVICE_STATUS_COMMAND(id));
                        const device = JSON.parse(rawDevice) as IDeckLinkDeviceResponse;
                        this.deckLinkDevices.set(id, {
                            id,
                            status: device.status,
                            pixelFormat: device.pixel_format,
                            detectedMode: device.detected_mode,
                        });
                    } catch (e) {
                        this.log(`failed to fetch device status ${id}`, true);
                    }
                }
                const devicesEvent: IBmddNodeServiceDevicesEvent = {
                    nodeId: this.nodeId,
                    devices: Object.fromEntries(this.deckLinkDevices),
                };
                this.emit("devices", devicesEvent);
            };
            this.pollingIntervalId = setInterval(handleDevices, 3000);
            this.log("devices status polling started");
            this.handleSubscribed(event.clientId);
        }
    }

    private handleUnsubscribe() {
        if (this.initialized) {
            this.log(`handling unsubscribe`);
        } else {
            this.log(`got unsubscribe event, but service was not initialized, emitting service fault`, true);
            const faultEvent: INodeServiceCommonFaultEvent = {
                nodeId: this.nodeId,
                origin: IServiceCommonFaultOrigin.node,
                type: IServiceCommonFaultType.event,
                event: "unsubscribe",
                message: "service not initialized",
            };
            this.emit("fault", faultEvent);
            return;
        }
        if (this.pollingIntervalId) {
            clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
            this.log("devices status polling stopped");
        }
    }
}
