import Redis from "ioredis";
import {io} from "socket.io-client";
import {
    IRealtimeAppStatusEvent,
    IRealtimeAppTimingEvent,
    IRedisAppChannelEvent,
    IRedisModuleNodeDataSubscribeEvent,
    IRedisToKeyAppBitrateEvent,
} from "@socket/shared-types";

export const redisTestRun = (url: string) => {
    const statusEvent: IRedisToKeyAppBitrateEvent = {
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
