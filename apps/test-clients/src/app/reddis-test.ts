import Redis from "ioredis";
import {io} from "socket.io-client";

export const redisTestRun = (url: string, nodeId: number) => {
    const event2 = {
        subscriptionType: "qos",
        nodeId,
        appType: "192.168.0.1",
        appId: 3000,
    };

    const socket = io(`${url}/redis`);

    socket.on("connect", () => {
        console.log("Client connected to RedisModule");
        socket.emit("subscribe", event2);
    });

    socket.on("realtimeQos", (data) => {
        console.log(`Redis qos ${JSON.stringify(data)}`);
        console.log("=================================");
    });

    socket.on("subscribed", (data) => {
        console.log(`Redis qos ${JSON.stringify(data)}`);
        console.log("=================================");
    });

    socket.on("monitoringData", (data) => {
        console.log(`Redis monitoring ${JSON.stringify(data)}`);
        console.log("=================================");
    });
};
