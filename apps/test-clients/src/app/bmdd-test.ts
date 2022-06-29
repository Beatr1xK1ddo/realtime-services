import {IBmddNodeServiceDevicesEvent, INodeServiceCommonFaultEvent} from "@socket/shared-types";
import {io} from "socket.io-client";

export const bmddTest = (url: string) => {
    const socket = io(`${url}/bmdd`);

    socket.on("connect", () => {
        socket.emit("subscribe", 2407);
        console.log("connected");
    });

    socket.on("subscribed", (event: IBmddNodeServiceDevicesEvent) => {
        console.log("subscribed", event.nodeId, event.devices);
    });

    socket.on("devices", (event: IBmddNodeServiceDevicesEvent) => {
        console.log("devices", event.nodeId, event.devices);
    });

    socket.on("fault", (event: INodeServiceCommonFaultEvent) => {
        console.log("fault", JSON.stringify(event));
    });
};
