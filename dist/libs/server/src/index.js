"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NxtRealtimeServer = void 0;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
class NxtRealtimeServer {
    reg(module) {
        if (NxtRealtimeServer.namespaces.has(module.name)) {
            throw TypeError(`Module with namespace: ${module.name} already exists`);
        }
        const ioNamespace = NxtRealtimeServer.io.of(`/${module.name}`);
        NxtRealtimeServer.namespaces.set(module.name, ioNamespace);
        module.init(ioNamespace);
    }
}
exports.NxtRealtimeServer = NxtRealtimeServer;
NxtRealtimeServer.namespaces = new Map();
NxtRealtimeServer.http = (0, http_1.createServer)();
NxtRealtimeServer.io = new socket_io_1.Server(NxtRealtimeServer.http, {
    cors: {
        origin: 'http://localhost:3001',
    },
}).listen(3000);
//# sourceMappingURL=index.js.map