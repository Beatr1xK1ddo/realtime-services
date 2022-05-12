import Redis from "ioredis";
import {IRealtimeAppStatusEvent, IRealtimeAppTimingEvent} from "@socket/shared-types";

export const redisTestRun = (url: string) => {

    const statusEvent: IRealtimeAppStatusEvent = {
        id: 391,
        type: "status",
        status: "stopped",
        statusChange: null,
    };
    const timingEvent: IRealtimeAppTimingEvent = {
        id: 391,
        type: "timing",
        startedAt: new Date().getTime(),
    };

    const handleRedisError = (error) => console.log(`redis error: ${error}`);
    const handleRedisConnection = () => {
        console.log("redis connection success");
        redis.publish("realtime:app:1088:ipbe", JSON.stringify(statusEvent));
        redis.publish("realtime:app:1088:ipbe", JSON.stringify(timingEvent));
    };

    const redis = new Redis(url);
    redis.on("connect", handleRedisConnection);
    redis.on("error", handleRedisError);
}
