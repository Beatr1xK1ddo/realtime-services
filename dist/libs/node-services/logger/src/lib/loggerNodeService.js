"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerNodeService = void 0;
const tslib_1 = require("tslib");
const chokidar_1 = require("chokidar");
const shared_types_1 = require("@socket/shared-types");
const path = require("path");
const child_process_1 = require("child_process");
const fs = require("fs");
const sysLog = 'system.ts';
class LoggerNodeService extends shared_types_1.NodeService {
    constructor(nodeId, url, appLogsPath, sysLogsPath, exclude) {
        super(nodeId, url);
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
            if (chunk !== file.lastChunk) {
                this.sendLog(chunk, info);
            }
            file.lastChunk = chunk;
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
        console.log('watch', this.watcher.getWatched());
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
            case shared_types_1.ELogTypes.appLog:
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
            case shared_types_1.ELogTypes.sysLog:
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
        console.log('watching file', filename);
        if (filename === sysLog)
            return { type: shared_types_1.ELogTypes.sysLog };
        const [appType, appId, appName, subType] = path
            .basename(filename, '.log')
            .replace('real--', '')
            .split('--');
        if (appType && appId) {
            return {
                type: shared_types_1.ELogTypes.appLog,
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
exports.LoggerNodeService = LoggerNodeService;
//# sourceMappingURL=loggerNodeService.js.map