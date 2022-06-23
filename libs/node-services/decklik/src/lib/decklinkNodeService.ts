import {IDecklinkLiveMonitor, IDecklinkNodeEvent} from "@socket/shared-types";
import {NodeService, NodeServiceOptions} from "@socket/shared/entities";
import fetch from "node-fetch";

export class DecklinkLiveNodeService extends NodeService {
    private timer?: NodeJS.Timer;
    private data?: IDecklinkLiveMonitor;
    private deviceStatusUrl: string;

    constructor(
        deviceStatusUrl: string,
        name: string,
        nodeId: number,
        mainServiceUrl: string,
        options?: NodeServiceOptions
    ) {
        super(name, nodeId, mainServiceUrl, options);
        this.deviceStatusUrl = deviceStatusUrl;
        this.emit("init", nodeId);
        this.registerHandler("subscribe", this.onSubscribe.bind(this));
        this.registerHandler("unsubscribe", this.onUnsubscribe.bind(this));
    }

    private onSubscribe() {
        if (!this.timer) {
            this.timer = setInterval(async () => {
                try {
                    const response: IDecklinkLiveMonitor = await (await fetch(this.deviceStatusUrl)).json();
                    if (JSON.stringify(this.data) !== JSON.stringify(response)) {
                        this.data = response;
                        this.emit("data", {nodeId: this.nodeId, data: response} as IDecklinkNodeEvent);
                    }
                } catch (e) {
                    this.log("Error while request to decklink status", true);
                }
            }, 1000);
        }
    }

    private onUnsubscribe() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
            this.log("subscription was removed");
        }
    }
}
