import {Manager} from "socket.io-client";
import {
    IClientCmdRequestEvent,
    IDeviceResponseError,
    IServerModuleMessage,
} from "@socket/shared-types";

const nodeId = 1337;
const ip = "localhost";
const port = 80;

const commands = ["VIDEO OUTPUT:\nVideo mode: 720p59.94\n\n"];
/*
const commands = [
    "VIDEO INPUT:\nAuto detection enabled: true\nAuto detection prefer PsF: false\nVideo source: SDI1\nAudio source: AES\nSignal present: false\nTimecode present: None\nClosed captioning present: None\nWide SD aspect: false\nHDMI 3D Full: false\nOptical module present: false\nVideo pixel format: YCbCr422\nPCIe mode: None\n",
    "VIDEO OUTPUT:\nVideo mode: 1080p59.94\nAspect ratio: Anamorphic\nVideo demux mode: SingleLink\nOutput sdi mode: LevelA\nQuad sdi output: QuadHDSplit\nQuad ancillary replication: true\nVideo pixel format: YCbCr422\nAnalog output: Component\nOutput option: Input\nTransition setting: 0\nStill frame present: false\nStill load complete: true\nStill store complete: true\nStill preview complete: true\nHDMI output: YCbCr422\n"
];
*/

export function hyperdeckTestRun(url: string) {
    console.log(`Initializing client connection to HyperdeckModule on ${url}`);
    const manager = new Manager(url);
    const socket = manager.socket("/hyperdeck");

    socket.on("subscribed", (data: IServerModuleMessage) => {
        console.log("subscribed client ", data);
    });

    socket.on("unsubscribed", (data: IServerModuleMessage) => {
        console.log(data.message);
    });

    socket.on("responseError", (data: IDeviceResponseError) => {
        console.log("responseError", data);
    });

    socket.on("connect", () => {
        console.log("Client connected to TeranexModule");
        socket.emit("subscribe", {nodeId, ip, port});
        socket.emit("commands", {
            nodeId,
            ip,
            port,
            commands: ["TERANEX DEVICE\n\n"],
            // commands,
        } as IClientCmdRequestEvent);

        // setTimeout(() => {
        //     socket.emit("commands", {
        //         nodeId,
        //         ip,
        //         port,
        //         // commands: ['TERANEX DEVICE\n\n'],
        //         commands,
        //     } as IClientCmdRequestEvent);
        // }, 3000);
    });
    socket.on("result", (data) => {
        console.log(`Teranex response ${JSON.stringify(data)}`);
    });
}
