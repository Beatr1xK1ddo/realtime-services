"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELogTypes = exports.DataProducer = void 0;
const socket_io_client_1 = require("socket.io-client");
class DataProducer {
    constructor(url) {
        this.url = url;
        this.socket = (0, socket_io_client_1.io)(this.url);
    }
}
exports.DataProducer = DataProducer;
var ELogTypes;
(function (ELogTypes) {
    ELogTypes["appLog"] = "applog";
    ELogTypes["sysLog"] = "syslog";
    ELogTypes["all"] = "all";
})(ELogTypes = exports.ELogTypes || (exports.ELogTypes = {}));
//# sourceMappingURL=types.js.map