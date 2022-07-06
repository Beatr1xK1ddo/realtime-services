import {MainServiceModule, MainServiceModuleOptions} from "@socket/shared/entities";
import Redis from "ioredis";
import {Mongoose} from "mongoose";
import {Socket} from "socket.io";

export class HlsAnalyzerModule extends MainServiceModule {
    private clients: Map<string, Set<Socket>>;
    private redis: Redis;
    private db: Mongoose;
    private dbURL = "mongodb+srv://admin:admin@cluster0.u3qaj.mongodb.net/?retryWrites=true&w=majority";
    private redisUrl: string;

    constructor(redisUrl: string, name: string, options?: MainServiceModuleOptions) {
        super(name, options);
        this.db = new Mongoose();
        this.clients = new Map();
        this.redisUrl = redisUrl;
        this.redis = new Redis(this.redisUrl);
        this.initRedis();
    }

    protected override onConnected(socket: Socket): void {
        super.onConnected(socket);
        socket.on("clientSubscribe", this.onClientSubscribe(socket));
        socket.on("clientUnsubscribe", this.onClientUnsubscribe(socket));
    }

    private onClientSubscribe(socket: Socket) {
        return async (channelName: string) => {
            if (!this.clients.has(channelName)) {
                this.clients.set(channelName, new Set([socket]));
            } else {
                this.clients.get(channelName)?.add(socket);
            }
            this.log(`Client ${socket.id} successfuly subscribed to ${channelName}`);
        };
    }

    private onClientUnsubscribe(socket: Socket) {
        return (channelName: string) => {
            if (!this.clients.has(channelName)) {
                this.log(`HlsAnalyzerModule has no channel ${channelName}`);
                return;
            }

            this.clients.get(channelName)?.delete(socket);

            this.log(`Socket: "${socket.id}" unsubscribed from channel: ${channelName}`);
        };
    }

    private async initDbConnection() {
        if (this.db.connection.readyState) {
            return;
        }
        try {
            await this.db.connect(this.dbURL);
        } catch (e) {
            console.log("Error", e);
        }
    }

    private async initRedis() {
        await this.initDbConnection();

        this.redis.on("pmessage", (_, channel, message: string) => {
            this.handleData(channel, message);
        });
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
        this.redis.psubscribe("*");
    }

    private handleData(channel: string, message: string) {
        try {
            const data = JSON.parse(message);
            const collection = this.db.connection.collection(channel);
            collection.insertOne(data);
            collection.find({}).forEach((iter) => console.log(iter));
        } catch (e) {
            console.log("Error", e);
        }
        const clients = this.clients.get(channel);
        if (!clients || !clients.size) return;
        clients.forEach((socket) => socket.emit("response", message));
        this.log(`Sending data to sockets which subscribed to ${channel} channel`);
    }
}
