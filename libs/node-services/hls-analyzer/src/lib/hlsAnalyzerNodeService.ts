import {NodeService} from "@socket/shared/entities";
import {FSWatcher, watch} from "chokidar";
import {readFileSync} from "fs";
import Redis from "ioredis";
import {basename} from "path";
export class HlsAnalyzerNodeService extends NodeService {
    private watcher?: FSWatcher;
    private pathes: string[] = [];
    private redis?: Redis;
    private redisPort: number;
    private redisIp: string;

    constructor(redisPort: number, redisIp: string, name: string, nodeId: number, url: string) {
        super(name, nodeId, url);
        this.redisPort = redisPort;
        this.redisIp = redisIp;
    }

    private connectToRedis() {
        this.redis = new Redis(this.redisPort, this.redisIp);

        this.redis.on("error", (error) => {
            this.log(`Redis error ${error}`, true);
        });
        this.redis.on("close", () => {
            this.log("Redis closed");
        });
        this.redis.on("reconnecting", () => {
            this.log("Redis reconnecting");
        });
        this.redis.on("connect", () => {
            this.log("Redis connected");
        });
    }

    private registerWatcher() {
        if (!this.redis) {
            this.connectToRedis();
        }
        this.watcher = watch(this.pathes, {ignoreInitial: true});

        this.watcher?.on("change", (path) => {
            const channel = basename(path);
            const file = readFileSync(path, {encoding: "utf-8"});
            const line = file.split(/\r?\n/).pop();
            if (line) {
                this.redis?.publish(channel, line);
            }
        });
    }

    public addFileToWatch(path: string) {
        this.pathes.push(path);
        if (!this.watcher) {
            this.registerWatcher();
        } else {
            this.watcher?.add(this.pathes);
        }
    }
}
