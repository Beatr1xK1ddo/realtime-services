import {ILogClientTypeEvent, ILogClientTypesEvent} from "@socket/shared-types";
import {io, Manager} from "socket.io-client";

export function loggerTestRun(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    // const manager = new Manager(url);
    // const socket = manager.socket('/logger');
    const socket = io(`${url}/logger`);

    socket.on("connect", () => {
        console.log("Client connected to LoggerModule");
        socket.emit("subscribeTypes", {nodeId: 1337, appType: "ipbe", appId: 123} as ILogClientTypesEvent);
        socket.emit("subscribeType", {
            nodeId: 1337,
            appType: "sysLog",
            appId: 12,
            logType: "logerTest",
        } as ILogClientTypeEvent);
    });

    socket.on("nodeDataTypes", (data) => {
        console.log("nodeDataTypes", data);
        console.log(`Logger data ${JSON.stringify(data)}`);
    });
    socket.on("nodeDataType", (data) => {
        console.log(`Logger data ${JSON.stringify(data)}`);
    });
    socket.on("error", (error) => {
        console.log(`Logger error ${JSON.stringify(error)}`);
    });
}
