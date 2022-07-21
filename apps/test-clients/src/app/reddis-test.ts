import {io} from "socket.io-client";

export const redisTestRun = (url: string) => {
    const statusEvent = {
        nodeId: 317,
        ip: "239.1.9.179",
        port: 1234,
    };

    const socket = io(`${url}/redis`);

    socket.on("connect", () => {
        console.log("Client connected to RedisModule");
        socket.emit("subscribe", statusEvent);

        // setTimeout(() => {
        //     socket.emit("unsubscribe", statusEvent);
        // }, 3000);
    });

    socket.on("realtimeAppData", (data) => {
        console.log(`Logger data ${JSON.stringify(data)}`);
    });
};
