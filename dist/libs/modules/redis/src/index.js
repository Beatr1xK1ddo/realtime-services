"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NxtRedis = void 0;
const tslib_1 = require("tslib");
const types_1 = require("./types");
const ioredis_1 = require("ioredis");
const config = require("../config.json");
class NxtRedis {
    constructor(name) {
        this.redis = new ioredis_1.default(config.redis);
        this.name = name;
    }
    init(io) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        }
        catch (e) {
            console.log('Ooops, :', e);
        }
    }
    handleConnection(socket) {
        socket.on('message', (data) => {
            console.log(data);
        });
    }
    onMessage(msg) {
        return new Promise((resolve, reject) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!msg.action || !(msg.action in types_1.EMessageActions)) {
                reject('Unavailable action type');
                return;
            }
            let resp = null;
            try {
                switch (msg.action.toLowerCase()) {
                    case types_1.EMessageActions.get:
                        resp = yield this.redis.mget(msg.data);
                        break;
                    case types_1.EMessageActions.set:
                        resp = yield this.redis.mset(msg.data);
                        break;
                    case types_1.EMessageActions.delete:
                        const stream = this.redis.scanStream({
                            match: msg.data,
                        });
                        stream.on('data', (keys) => {
                            if (!keys.length) {
                                return;
                            }
                            const pipeline = this.redis.pipeline();
                            keys.forEach((key) => {
                                pipeline.del(key);
                            });
                            pipeline.exec();
                        });
                        stream.on('end', () => console.log('NxtRedis del was finished'));
                        stream.on('error', (error) => console.log('Ooops: ', error));
                        break;
                }
            }
            catch (e) {
                reject('Redis connection issue');
                return;
            }
            resolve({
                success: true,
                data: resp,
            });
        }));
    }
}
exports.NxtRedis = NxtRedis;
//# sourceMappingURL=index.js.map