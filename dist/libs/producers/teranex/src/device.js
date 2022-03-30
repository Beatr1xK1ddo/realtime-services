"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeranexDevice = void 0;
const net_1 = require("net");
class TeranexDevice {
    constructor(ip, port) {
        this.timeout = 2000;
        this.busy = false;
        this.ip = ip;
        this.port = port;
    }
    connect() {
        if (this.socket) {
            this.destroy();
        }
        this.socket = new net_1.Socket();
        this.socket.setEncoding('utf8');
        this.socket.setTimeout(this.timeout);
        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
                data: '',
            };
            this.socket.connect({ host: this.ip, port: this.port }, () => this.response.resolve());
            this.socket.on('data', (data) => (this.response.data += data.toString()));
            this.socket.on('error', (err) => this.response.reject(err));
            this.socket.on('timeout', () => this.response.reject(Error('timeout')));
        });
    }
    command(cmd, timeout = 0.7) {
        return new Promise((resolve, reject) => {
            this.response = {
                resolve,
                reject,
                data: '',
            };
            this.socket.write(cmd, (error) => reject(error));
            setTimeout(() => resolve(this.response.data), timeout * 1000);
        });
    }
    destroy() {
        var _a;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.end();
    }
}
exports.TeranexDevice = TeranexDevice;
//# sourceMappingURL=device.js.map