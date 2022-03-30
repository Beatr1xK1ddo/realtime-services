"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const _ = require("lodash");
const shell = require("child_process");
const ipRegex = require("ip-port-regex");
const uuid_1 = require("uuid");
const loadIniFile = require("read-ini-file");
const url = require("url");
const conf = require("../config.json");
exports.default = {
    isValidIP(ip) {
        return ipRegex({ exact: true }).test(ip.split(':').shift());
    },
    getHostNodeID() {
        return loadIniFile.sync(conf.hostConfigIni).instance_id;
    },
    generateToken() {
        return (0, uuid_1.v4)();
    },
    getReqQuery(req) {
        const { query } = url.parse(req.url, true);
        return query;
    },
    resolvePath(filepath) {
        return __dirname + '/' + filepath;
    },
    currentTime() {
        return Math.round(new Date().getTime() / 1000);
    },
    exec(cmd) {
        return new Promise((resolve, reject) => {
            shell.exec(cmd, (err, output) => {
                err ? reject(err) : resolve(output);
            });
        });
    },
    getCache(key, saveCallback) {
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
    },
    log(message) {
        try {
            (0, fs_1.appendFile)(conf.logDir + 'common_log.txt', new Date().toUTCString() + '  ' + message + '\n', (err) => {
                err && console.log(err.toString());
            });
        }
        catch (e) { }
    },
    getPort(url) {
        return _.trim(url.split(':').slice(-1).pop(), '/');
    },
};
//# sourceMappingURL=index.js.map