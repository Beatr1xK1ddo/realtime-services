"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = exports.currentTime = exports.getNodeId = exports.exec = void 0;
const tslib_1 = require("tslib");
const shell = require("child_process");
const fs_1 = require("fs");
//todo: utils should not rely on any configs/ all utils functions should rely on args instead
const conf = require("./config.json");
function exec(cmd) {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, (err, output) => {
            err ? reject(err) : resolve(output);
        });
    });
}
exports.exec = exec;
function getNodeId() {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        let nodeId = null;
        try {
            const id = yield exec('/usr/bin/php /root/dv_control_new.php hostname');
            nodeId = Number.parseInt(id);
        }
        catch (e) {
            console.warn('NXT|WARNING: Cannot get node id');
        }
        return nodeId;
    });
}
exports.getNodeId = getNodeId;
function currentTime() {
    return Math.round(new Date().getTime() / 1000);
}
exports.currentTime = currentTime;
function getCache(key, saveCallback) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        let dataContent = null;
        try {
            const cacheFile = `${conf.logDir}${key}`;
            let isExpired = false;
            if ((0, fs_1.existsSync)(cacheFile)) {
                const { expires, data } = JSON.parse((0, fs_1.readFileSync)(cacheFile, 'utf8'));
                if (+expires < this.currentTime()) {
                    isExpired = true;
                }
                else {
                    dataContent = data;
                }
            }
            else {
                isExpired = true;
            }
            if (isExpired) {
                dataContent = yield saveCallback();
                setTimeout(() => {
                    (0, fs_1.writeFileSync)(cacheFile, JSON.stringify({
                        expires: this.currentTime() + 1800,
                        data: dataContent || null,
                    }));
                });
            }
        }
        catch (e) {
            dataContent = null;
        }
        return Promise.resolve(dataContent || null);
    });
}
exports.getCache = getCache;
//# sourceMappingURL=nodeUtils.js.map