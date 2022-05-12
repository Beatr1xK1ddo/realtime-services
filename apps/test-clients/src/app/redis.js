import Redis from "ioredis";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const {triggerTimingChange, triggerStatusChange} = redisTestRun("redis://:c709bdf5f5c2be2a8a1e8da19bf88400a21421ec@38.121.75.100:80");
let state = "active";
let time = new Date();

const recursiveAsyncReadLine = function() {
    rl.question("action: ?\n"
        + "1) state\n"
        + "2) time\n"
        + "3) exit\n"
        , function(line) {
            switch (line) {
                case "state":
                case "1":
                    state = state === "active" ? "stopped" : "active";
                    triggerStatusChange(state);
                    console.log("state: ", state);
                    break;
                case "time":
                case "2":
                    time = new Date(time.setHours(-1));
                    triggerTimingChange(time.getTime());
                    console.log("time: ", time.toLocaleDateString());
                    break;
                case "exit":
                case "3":
                    return rl.close();
                    break;
                default:
                    console.log("No such option. Please enter another: ");
            }
            recursiveAsyncReadLine(); //Calling this function again to ask new question
        });
};

recursiveAsyncReadLine();

function redisTestRun (url) {

    const handleRedisError = (error) => console.log(`redis error: ${error}`);
    const handleRedisConnection = () => console.log("redis connection success");

    const triggerStatusChange = (status) => {
        const statusEvent = {
            id: 391,
            type: "status",
            status,
            statusChange: null,
        };
        redis.publish("realtime:app:1088:ipbe", JSON.stringify(statusEvent));
    }
    const triggerTimingChange = (startTime) => {
        const timingEvent = {
            id: 391,
            type: "timing",
            startedAt: startTime || new Date().getTime(),
        };
        redis.publish("realtime:app:1088:ipbe", JSON.stringify(timingEvent));
    }

    const redis = new Redis(url);
    redis.on("connect", handleRedisConnection);
    redis.on("error", handleRedisError);

    return{
        triggerStatusChange,
        triggerTimingChange
    }
}
