"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeService = void 0;
const socket_io_client_1 = require("socket.io-client");
class NodeService {
    constructor(nodeId, url) {
        this.nodeId = nodeId;
        this.url = url;
        this.socket = (0, socket_io_client_1.io)(this.url);
    }
}
exports.NodeService = NodeService;
//# sourceMappingURL=nodeService.js.map