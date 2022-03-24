import { FSWatcher, watch } from 'chokidar';
import { basename } from 'path';
import { DataProducer, ELogTypes, ILogMessage } from '@socket/interfaces';
import * as path from 'path';
import { spawn } from 'child_process';
import { IFile } from './types';
import * as fs from 'fs';

import * as conf from 'config';

const sysLog = 'system.ts';

const MSG_PER_SECONDS = 500;

const { applogDir, syslogFile, excludeMessages } = conf.logAgent;

const REGEX_APPLOG_TRASH = new RegExp(
    `(${excludeMessages.applog.join('|')})`,
    'i'
);
const REGEX_SYSLOG_TRASH = new RegExp(
    `(${excludeMessages.syslog.join('|')})`,
    'i'
);

export class LoggerProducer extends DataProducer {
    private watcher: FSWatcher;
    private path: string;
    private mapFiles: Map<string, IFile> = new Map();
    private nodeId: number;

    constructor(url: string, path: string, nodeId: number) {
        super(url);
        this.path = path;
        this.watcher = watch(this.path, {
            ignoreInitial: true,
        });
        this.nodeId = nodeId;
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

    private converter(path: string) {
        const filename = basename(path);
        const fileDomains = filename.split('.');
        let data: ILogMessage;

        if (filename === sysLog) {
            data = {
                type: ELogTypes.syslog,
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
                type: ELogTypes.applog,
                message: filename,
                created: +new Date(),
                nodeId: 1,
            };
        }

        return data;
    }

    isTrashData(data: string, filename: string) {
        if (filename === syslogFile) {
            return REGEX_SYSLOG_TRASH.test(data);
        } else {
            return REGEX_APPLOG_TRASH.test(data);
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
        this._watch(syslogFile);

        this.watcher = watch(applogDir, {
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
            case ELogTypes.applog:
                this.socket.emit('data', {
                    type: info.type,
                    message: msg,
                    created: +createdTime,
                    nodeId: +this.nodeId,
                    appId: +info.appId,
                    appType: info.appType,
                    appName: info.appName,
                    subType: info.subType,
                });
                break;
            case ELogTypes.syslog:
                this.socket.emit('data', {
                    type: info.type,
                    message: msg,
                    created: +createdTime,
                    nodeId: +this.nodeId,
                });
                break;
        }
    }

    _unwatchAll() {
        this.watcher && this.watcher.unwatch(applogDir);
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
        if (filename === sysLog) return { type: ELogTypes.syslog };

        const [appType, appId, appName, subType] = path
            .basename(filename, '.log')
            .replace('real--', '')
            .split('--');

        if (appType && appId) {
            return {
                type: ELogTypes.applog,
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
