import Redis from "ioredis";
import {io} from "socket.io-client";
import {
    IRealtimeAppStatusEvent,
    IRealtimeAppTimingEvent,
    IRedisGetAppBitrateEvent,
    IRedisSubAppSubscribeEvent,
} from "@socket/shared-types";

export const redisTestRun = (url: string) => {
    const statusEvent: IRedisSubAppSubscribeEvent = {
        nodeId: 11,
        appType: "127.0.0.1",
        appId: 3000,
    };
    const socket = io(`${url}/redis`);

    socket.on("connect", () => {
        console.log("Client connected to RedisModule");
        socket.emit("subscribeApp", statusEvent);
    });

    socket.on("realtimeAppData", (data) => {
        console.log(`Logger data ${JSON.stringify(data)}`);
    });
};
