"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeranexNodeService = void 0;
const tslib_1 = require("tslib");
const shared_types_1 = require("@socket/shared-types");
const device_1 = require("./device");
class TeranexNodeService extends shared_types_1.NodeService {
    constructor() {
        super(...arguments);
        this.devices = {};
    }
    init() {
        this.socket.on('connect', () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.socket.emit('init', { nodeId: this.nodeId });
        }));
        this.socket.on('request', this.handleRequest.bind(this));
        this.socket.on('error', (error) => console.log('Ooops: ', error));
    }
    handleRequest(data) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { ip, port, commands } = data;
            const deviceId = `${ip}:${port}`;
            const device = yield this.getDevice(deviceId);
            try {
                if (device.busy) {
                    this.socket.emit('response', {
                        nodeId: this.nodeId,
                        ip,
                        port,
                        error: 'Device is busy',
                    });
                    return;
                }
                device.busy = true;
                let data = [];
                for (const cmd of commands) {
                    data.push(yield device.command(cmd));
                }
                device.busy = false;
                data = data.map((val) => val.replace(/\n\n/g, '\n').replace(/ACK\n/, ''));
                this.socket.emit('response', {
                    nodeId: this.nodeId,
                    ip,
                    port,
                    data,
                });
            }
            catch (e) {
                this.clearDevice(deviceId);
                let error;
                if (e.code === 'ECONNREFUSED') {
                    error = 'Device is unavailable';
                }
                else if (e.message === 'timeout') {
                    error = 'Device timeout';
                }
                else {
                    error = 'Device unknown error';
                }
                this.socket.emit('response', {
                    nodeId: this.nodeId,
                    ip,
                    port,
                    error,
                });
            }
        });
    }
    getDevice(deviceId) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.devices[deviceId]) {
                return this.devices[deviceId];
            }
            try {
                const [ip, port] = deviceId.split(':');
                const device = new device_1.TeranexDevice(ip, parseInt(port));
                yield device.connect();
                yield device.command('ping\r\n');
                this.devices[deviceId] = device;
            }
            catch (e) {
                console.log('Ooops: ', e);
                this.devices[deviceId] = null;
            }
            return this.devices[deviceId];
        });
    }
    clearDevice(deviceId) {
        this.devices[deviceId].destroy();
        this.devices[deviceId] = null;
    }
}
exports.TeranexNodeService = TeranexNodeService;
//# sourceMappingURL=teranexNodeService.js.map