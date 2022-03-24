import { FSWatcher, watch } from 'chokidar';
import { basename } from 'path';
import { DataProducer, ELogTypes, ILogData } from '@socket/interfaces';
import * as path from 'path';
import { spawn } from 'child_process';
import { IFile } from './types';
import * as fs from 'fs';

const sysLog = 'system.ts';
const MSG_PER_SECONDS = 500;

export class LoggerProducer extends DataProducer {
    private nodeId: number;
    private appLogsPath: string;
    private sysLogsPath: string;
    private excludeAppLogRegexp: RegExp;
    private excludeSysLogRegexp: RegExp;
    private watcher: FSWatcher;
    private mapFiles: Map<string, IFile> = new Map();

    constructor(nodeId: number, url: string, appLogsPath: string, sysLogsPath: string, exclude: any) {
        super(url);
        this.nodeId = nodeId;
        this.appLogsPath = appLogsPath;
        this.sysLogsPath = sysLogsPath;
        this.excludeAppLogRegexp = new RegExp(
            `(${exclude.applog.join('|')})`,
            'i'
        );
        this.excludeSysLogRegexp = new RegExp(
            `(${exclude.syslog.join('|')})`,
            'i'
        );
        this.watcher = watch(this.appLogsPath, {
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

    isTrashData(data: string, filename: string) {
        if (filename === this.sysLogsPath) {
            return this.excludeSysLogRegexp.test(data);
        } else {
            return this.excludeAppLogRegexp.test(data);
        }
    }

    _watch(filename: string) {
        const info = this._parseFilename(filename);

        if (!info.type) return;

        const file: IFile = {
            counter: 0,
            lastChunk: null,
            tail: spawn('tail', `-f ${filename}`.split(' ')),
        };

        this.mapFiles.set(filename, file);

        file.tail.stdout.setEncoding('utf8');
        file.tail.stdout.on('data', (_chunk) => {
            const chunk = _chunk.toString().trim();

            if (this.isTrashData(chunk, filename)) return;

            if (file.counter < MSG_PER_SECONDS) {
                if (chunk !== file.lastChunk) {
                    this.sendLog(chunk, info);
                }

                file.lastChunk = chunk;
            } else if (file.counter === MSG_PER_SECONDS) {
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

        this.watcher = watch(this.appLogsPath, {
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

    sendLog(msg: string, info: any) {
        const createdTime = Math.round(Date.now() / 1000);

        switch (info.type) {
            case ELogTypes.appLog:
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
            case ELogTypes.sysLog:
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

    _unwatch(filename: string) {
        if (this.mapFiles.has(filename)) {
            this.mapFiles.get(filename)?.tail.kill('SIGINT');
            this.mapFiles.delete(filename);
        }
    }

    _parseFilename(filename: string) {
        if (filename === sysLog) return { type: ELogTypes.sysLog };

        const [appType, appId, appName, subType] = path
            .basename(filename, '.log')
            .replace('real--', '')
            .split('--');

        if (appType && appId) {
            return {
                type: ELogTypes.appLog,
                appId,
                appType,
                appName,
                subType,
            };
        }

        return { type: null };
    }

    debug(message: string) {
        const filename = '/var/log/logagent_debug.log';

        try {
            process.umask(0);

            fs.appendFile(
                `${filename}`,
                new Date().toISOString() + '  ' + message + '\n',
                { mode: '777' },
                (err) => {
                    err && console.error(err.toString());
                }
            );
        } catch (e) {}
    }

    async _onMessage(req: any) {
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
        } catch (e) {
            this.socket.emit('data', {
                receiver: sender,
                error: e,
                tag,
            });
        }
    }
}
