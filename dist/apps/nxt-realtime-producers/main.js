/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./libs/interfaces/src/index.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__("tslib");
(0, tslib_1.__exportStar)(__webpack_require__("./libs/interfaces/src/types.ts"), exports);


/***/ }),

/***/ "./libs/interfaces/src/types.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ELogTypes = exports.DataProducer = void 0;
const socket_io_client_1 = __webpack_require__("socket.io-client");
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


/***/ }),

/***/ "./libs/producers/logger/src/index.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LoggerProducer = void 0;
const tslib_1 = __webpack_require__("tslib");
const chokidar_1 = __webpack_require__("chokidar");
const interfaces_1 = __webpack_require__("./libs/interfaces/src/index.ts");
const path = __webpack_require__("path");
const child_process_1 = __webpack_require__("child_process");
const fs = __webpack_require__("fs");
const sysLog = 'system.ts';
const MSG_PER_SECONDS = 500;
class LoggerProducer extends interfaces_1.DataProducer {
    constructor(nodeId, url, appLogsPath, sysLogsPath, exclude) {
        super(url);
        this.mapFiles = new Map();
        this.nodeId = nodeId;
        this.appLogsPath = appLogsPath;
        this.sysLogsPath = sysLogsPath;
        this.excludeAppLogRegexp = new RegExp(`(${exclude.applog.join('|')})`, 'i');
        this.excludeSysLogRegexp = new RegExp(`(${exclude.syslog.join('|')})`, 'i');
        this.watcher = (0, chokidar_1.watch)(this.appLogsPath, {
            ignoreInitial: true,
        });
    }
    // init() {
    //     this.socket.on('connect', this.watch.bind(this));
    // this.socket.on('message', this.onMessage);
    //     this.socket.on('error', (error) => console.log('Ooops', error));
    // }
    init() {
        this.socket.on('connect', this._watchAll.bind(this));
        this.socket.on('message', (jsonData) => this._onMessage(jsonData));
        this.socket.on('error', (error) => console.log('Ooops', error));
    }
    // private watch() {
    //     this.watcher.on('add', (path) => {
    //         const data = this.converter(path);
    //         this.send(data);
    //     });
    //     this.watcher.on('unlink', (path) => {
    //         // this.mapFiles.delete(path);
    //         console.log(`File ${path} has been removed`, this.mapFiles);
    //     });
    //     this.watcher.on('ready', () => {
    //         console.log(
    //             `WatcherID: "${this.socket.id}" ready to changes!!!`,
    //             this.mapFiles
    //         );
    //     });
    // }
    // private send(data: ILogMessage) {
    //     this.socket.emit('data', data);
    // }
    // private addFile() {
    //     this.mapFiles.set();
    // }
    // private onMessage(message) {}
    /*
        private converter(path: string) {
            const filename = basename(path);
            const fileDomains = filename.split('.');
            let data: ILogData;
    
            if (filename === sysLog) {
                data = {
                    type: ELogTypes.sysLog,
                    message: filename,
                    created: +new Date(),
                    appId: 1,
                    appName: filename,
                    appType: fileDomains[0],
                    subType: fileDomains[1],
                    nodeId: 1,
                };
            } else {
                data = {
                    type: ELogTypes.appLog,
                    message: filename,
                    created: +new Date(),
                    nodeId: 1,
                };
            }
    
            return data;
        }
    */
    isTrashData(data, filename) {
        if (filename === this.sysLogsPath) {
            return this.excludeSysLogRegexp.test(data);
        }
        else {
            return this.excludeAppLogRegexp.test(data);
        }
    }
    _watch(filename) {
        const info = this._parseFilename(filename);
        if (!info.type)
            return;
        const file = {
            counter: 0,
            lastChunk: null,
            tail: (0, child_process_1.spawn)('tail', `-f ${filename}`.split(' ')),
        };
        this.mapFiles.set(filename, file);
        file.tail.stdout.setEncoding('utf8');
        file.tail.stdout.on('data', (_chunk) => {
            const chunk = _chunk.toString().trim();
            if (this.isTrashData(chunk, filename))
                return;
            if (file.counter < MSG_PER_SECONDS) {
                if (chunk !== file.lastChunk) {
                    this.sendLog(chunk, info);
                }
                file.lastChunk = chunk;
            }
            else if (file.counter === MSG_PER_SECONDS) {
                this.sendLog('Too many logs per second', info);
            }
            file.counter++;
        });
        file.tail.stderr.on('data', (data) => {
            this.debug(`stderr: ${data.toString()}`);
        });
        file.tail.on('error', (error) => {
            this.debug(`error: ${error.message}`);
        });
        file.tail.on('close', (code) => {
            this.debug(`close ${code}`);
        });
    }
    _watchAll() {
        this._unwatchAll();
        this._watch(this.sysLogsPath);
        this.watcher = (0, chokidar_1.watch)(this.appLogsPath, {
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 200,
                pollInterval: 1000,
            },
        });
        this.watcher
            .on('add', (fname) => this._watch(fname))
            .on('unlink', (fname) => this._unwatch(fname));
    }
    // send(receiver, data, tag = null) {
    //     this.service.send(
    //         JSON.stringify({
    //             receiver,
    //             data,
    //             tag,
    //         })
    //     );
    // }
    sendLog(msg, info) {
        const createdTime = Math.round(Date.now() / 1000);
        switch (info.type) {
            case interfaces_1.ELogTypes.appLog:
                this.socket.emit('data', {
                    nodeId: this.nodeId,
                    data: {
                        type: info.type,
                        message: msg,
                        created: +createdTime,
                        nodeId: +this.nodeId,
                        appId: +info.appId,
                        appType: info.appType,
                        appName: info.appName,
                        subType: info.subType,
                    },
                });
                break;
            case interfaces_1.ELogTypes.sysLog:
                this.socket.emit('data', {
                    nodeId: this.nodeId,
                    data: {
                        type: info.type,
                        message: msg,
                        created: +createdTime,
                        nodeId: +this.nodeId,
                    },
                });
                break;
        }
    }
    _unwatchAll() {
        this.watcher && this.watcher.unwatch(this.appLogsPath);
        this.mapFiles.forEach((item) => item.tail.kill('SIGINT'));
        this.mapFiles.clear();
    }
    _unwatch(filename) {
        var _a;
        if (this.mapFiles.has(filename)) {
            (_a = this.mapFiles.get(filename)) === null || _a === void 0 ? void 0 : _a.tail.kill('SIGINT');
            this.mapFiles.delete(filename);
        }
    }
    _parseFilename(filename) {
        if (filename === sysLog)
            return { type: interfaces_1.ELogTypes.sysLog };
        const [appType, appId, appName, subType] = path
            .basename(filename, '.log')
            .replace('real--', '')
            .split('--');
        if (appType && appId) {
            return {
                type: interfaces_1.ELogTypes.appLog,
                appId,
                appType,
                appName,
                subType,
            };
        }
        return { type: null };
    }
    debug(message) {
        const filename = '/var/log/logagent_debug.log';
        try {
            process.umask(0);
            fs.appendFile(`${filename}`, new Date().toISOString() + '  ' + message + '\n', { mode: '777' }, (err) => {
                err && console.error(err.toString());
            });
        }
        catch (e) { }
    }
    _onMessage(req) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { sender, error, data, tag } = JSON.parse(req);
            if (sender === 'service_manager') {
                console.error(error);
                return;
            }
            try {
                // const res = await Promise.resolve(this.onMessage(data, sender));
                this.socket.emit('data', {
                    receiver: sender,
                    data,
                    tag,
                });
            }
            catch (e) {
                this.socket.emit('data', {
                    receiver: sender,
                    error: e,
                    tag,
                });
            }
        });
    }
}
exports.LoggerProducer = LoggerProducer;


/***/ }),

/***/ "chokidar":
/***/ ((module) => {

module.exports = require("chokidar");

/***/ }),

/***/ "socket.io-client":
/***/ ((module) => {

module.exports = require("socket.io-client");

/***/ }),

/***/ "tslib":
/***/ ((module) => {

module.exports = require("tslib");

/***/ }),

/***/ "child_process":
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "fs":
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "./apps/nxt-realtime-producers/src/config.json":
/***/ ((module) => {

module.exports = JSON.parse('{"secret":"316a72f7-631c-4c8d-b380-b8a1a0d0de23","rootDir":"/home/dv2/ws_services","proxy":"wss://cp.nextologies.com:9904/","manager":"wss://127.0.0.1:9905/","redis":"redis://:c709bdf5f5c2be2a8a1e8da19bf88400a21421ec@172.19.1.4:80","server":"wss://cp.nextologies.com:9904/","pingInterval":300,"logDir":"../../var/log/","cacheDir":"../../var/cache/","ssl":{"key":"../cert/nextologies.com.key","crt":"../cert/ed1cf1e8c47efb33.crt","ca":"../cert/gd_bundle-g2-g1.crt"},"logAgent":{"applogDir":"/home/dv2/data/logs/real--*.log","syslogFile":"/var/log/syslog","excludeMessages":{"applog":["ultragrid","cesnet"],"syslog":["cron","postfix"]}},"live_monitor":{"history":{"bin":"/home/www/dv2/html/davinci/web/mline.php","depth":43200}},"hostConfigIni":"/root/dv_control_new.ini"}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const logger_1 = __webpack_require__("./libs/producers/logger/src/index.ts");
const config = __webpack_require__("./apps/nxt-realtime-producers/src/config.json");
const { logAgent: { applogDir, syslogFile, excludeMessages } } = config;
const producer = new logger_1.LoggerProducer(15456451, 'ws://qa.nextologies.com:1807/logger', applogDir, syslogFile, excludeMessages);

})();

var __webpack_export_target__ = exports;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
//# sourceMappingURL=main.js.map