"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Teranex = void 0;
const tslib_1 = require("tslib");
const device_1 = require("./device");
class Teranex {
    constructor() {
        this.messages = [];
        this.devices = {};
        this.blocked = false;
        setInterval(() => this._handleMessages());
    }
    init(io) {
        this.io = io;
        this.io.on('connection', this.onConnection);
    }
    onConnection(socket) {
        socket.on('message', (data) => this._onMessage(data));
    }
    _handleMessages() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.messages.length || this.blocked)
                return;
            this.blocked = true;
            const MSG = this.messages.shift();
            const DEVICE_ID = `${MSG.data.ip}:${MSG.data.port}`;
            try {
                const device = yield this._getDevice(DEVICE_ID);
                if (device.busy)
                    return;
                device.busy = true;
                const { commands } = MSG.data;
                let results = [];
                for (const cmd of commands) {
                    results.push(yield device.command(cmd));
                }
                results = results.map((val) => val.replace(/\n\n/g, '\n').replace(/ACK\n/, ''));
                device.busy = false;
                MSG.resolve(results);
            }
            catch (e) {
                this.devices[DEVICE_ID].destroy();
                this.devices[DEVICE_ID] = null;
                if (e.code === 'ECONNREFUSED') {
                    MSG.reject('Device is unavailable');
                }
                else if (e.message === 'timeout') {
                    MSG.reject('Device timeout');
                }
                else {
                    MSG.reject('Device unknown error');
                }
            }
            finally {
                this.blocked = false;
            }
        });
    }
    _getDevice(DEVICE_ID) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.devices[DEVICE_ID]) {
                return this.devices[DEVICE_ID];
            }
            try {
                const [ip, port] = DEVICE_ID.split(':');
                const device = new device_1.TeranexDevice(ip, port);
                yield device.connect();
                yield device.command('ping\r\n');
                this.devices[DEVICE_ID] = device;
            }
            catch (e) {
                console.log('Ooops: ', e);
            }
            return this.devices[DEVICE_ID];
        });
    }
    onMessage(data) {
        return new Promise((resolve, reject) => {
            this.messages.push({
                data,
                resolve,
                reject,
            });
        });
    }
    _onMessage(req) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { sender, error, data, tag } = JSON.parse(req);
            if (sender === 'service_manager') {
                console.error(error);
                return;
            }
            try {
                const res = yield Promise.resolve(this.onMessage(data));
                this.io.send({
                    receiver: sender,
                    data: res,
                    tag,
                });
            }
            catch (e) {
                this.io.send({
                    receiver: sender,
                    error: e,
                    tag,
                });
            }
        });
    }
}
exports.Teranex = Teranex;
//# sourceMappingURL=index.js.map