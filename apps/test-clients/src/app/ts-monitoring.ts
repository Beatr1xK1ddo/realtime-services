import {io} from "socket.io-client";

export const tsMonitoring = (url: string) => {
    const event = {
        subscriptionType: "tsMonitoring",
        origin: {
            nodeId: 1337,
            ip: "123.0.0.1",
            port: 1234,
        },
    };

    const socket = io(`${url}/redis`);

    socket.on("connect", () => {
        console.log("Client connected to RedisModule");
        socket.emit("subscribe", event);
    });

    socket.on("data", (data) => {
        console.log(`Redis ts-monitoring ${JSON.stringify(data)}`);
        console.log("=================================");
    });

    socket.on("subscribed", (data) => {
        console.log(`Redis ts-monitoring`, data);
        console.log("=================================");
    });
};
