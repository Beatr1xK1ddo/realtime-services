import {IDecklinkLiveMonitor} from "@socket/shared-types";
import {io} from "socket.io-client";

export const decklinkTest = (url: string) => {
    const socket = io(url);

    socket.on("connect", () => {
        console.log("Client connected to LoggerModule");
        socket.emit("subscribe", 1337);
    });

    socket.on("data", (data: IDecklinkLiveMonitor) => {
        console.log(`Decklink data`, data);
    });
    socket.on("error", (error) => {
        console.log(`Logger error ${JSON.stringify(error)}`);
    });
};
