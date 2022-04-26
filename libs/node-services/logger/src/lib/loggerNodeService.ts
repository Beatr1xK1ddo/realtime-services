import { FSWatcher, watch } from 'chokidar';
import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';

import type { IFile } from './types';

import { ELogTypes } from '@socket/shared-types';
import { NodeService } from '@socket/shared/entities';

const sysLog = 'system.ts';

export class LoggerNodeService extends NodeService {
    private appLogsPath: string;
    private sysLogsPath: string;
    private excludeAppLogRegexp: RegExp;
    private excludeSysLogRegexp: RegExp;
    private watcher: FSWatcher;
    private mapFiles: Map<string, IFile> = new Map();

    constructor(
        name: string,
        nodeId: number,
        url: string,
        appLogsPath: string,
        sysLogsPath: string,
        exclude: any
    ) {
        super(name, nodeId, url);
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

    protected override onConnected() {
        super.onConnected();
        this._watchAll();
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
            .on('add', (fname) => {
                this.log(`Watcher "add" ${fname}`);
                this._watch(fname);
            })
            .on('unlink', (fname) => {
                this._unwatch(fname);
                this.log(`Watcher "unlink" ${fname}`);
            });
    }

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

            if (chunk !== file.lastChunk) {
                this.sendLog(chunk, info);
            }
            file.lastChunk = chunk;
        });

        file.tail.stderr.on('data', (data) => {
            this.log(`Running file.tail.stderr on "data": ${data}`);
            this.debug(`stderr: ${data.toString()}`);
        });
        file.tail.on('error', (error) => {
            this.log(`file.tail error: ${error}`, true);
            this.debug(`error: ${error.message}`);
        });
        file.tail.on('close', (code) => {
            this.log(`Running file.tail on "close": ${code}`);
            this.debug(`close ${code}`);
        });
    }

    sendLog(msg: string, info: any) {
        const createdTime = Math.round(Date.now() / 1000);
        switch (info.type) {
            case ELogTypes.appLog:
                this.log(
                    `Sending log from "node ${this.nodeId}" and "logType: ${info.type}"`
                );
                this.emit('data', {
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
                this.log(
                    `Sending log from "node ${this.nodeId}" and "logType: ${info.type}"`
                );
                this.emit('data', {
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
        this.log(`Watching file ${filename}`);
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
                    if (err) {
                        this.log(`Error while debug ${err.toString()}`);
                    }
                }
            );
        } catch (e) {
            this.log(`Error while debug on catch block ${e}`, true);
        }
    }
}
