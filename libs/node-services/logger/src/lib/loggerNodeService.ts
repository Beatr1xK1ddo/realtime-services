import * as path from "path";
import {spawn} from "child_process";
import {watch, FSWatcher} from "chokidar";

import {IAppLogMessage, ILogNodeTypesDataEvent} from "@socket/shared-types";
import {NodeService} from "@socket/shared/entities";
import {readFile, open, write, close, existsSync, mkdirSync, readdir, writeFile} from "fs";

const sysLog = "system.ts";
const connectionLostDir = "historyLog";

type ILogTypeInfo = {
    prevValue: string;
    counter: number;
    timer: NodeJS.Timer;
};

const allowedFile = /real--[a-z0-9_]+--[0-9]+--[a-z0-9_]+--[a-z0-9_]+.log$/i;

export class LoggerNodeService extends NodeService {
    private appLogsPath: string;
    private sysLogsPath: string;
    private excludeAppLogRegexp?: RegExp;
    private excludeSysLogRegexp?: RegExp;
    private watcher?: FSWatcher;

    private logTypes: Map<string, Map<number, Map<string, ILogTypeInfo>>>;
    private connected: boolean;

    constructor(name: string, nodeId: number, url: string, appLogsPath: string, sysLogsPath: string, exclude?: any) {
        super(name, nodeId, url);
        this.nodeId = nodeId;
        this.appLogsPath = appLogsPath;
        this.sysLogsPath = sysLogsPath;
        this.logTypes = new Map();
        this.connected = false;
        if (!existsSync(`${this.appLogsPath}/${connectionLostDir}`)) {
            mkdirSync(`${this.appLogsPath}/${connectionLostDir}`);
        }
        if (exclude) {
            this.excludeAppLogRegexp = new RegExp(`(${exclude?.applog.join("|")})`, "i");
            this.excludeSysLogRegexp = new RegExp(`(${exclude?.syslog.join("|")})`, "i");
        }
    }

    // socket
    protected override onConnected() {
        this.connected = true;
        super.onConnected();
        this.sendUntruckedMessages();
        this.startWatching();
        this.emit("init", this.nodeId);
    }

    // watcher file handlers
    private startWatching() {
        this.watcher = watch([this.appLogsPath, this.sysLogsPath]);
        this.watcher.on("change", this.onFileChange.bind(this));
        this.watcher.on("add", this.onFileAdd.bind(this));
    }

    private onFileAdd(pathname: string) {
        const fileName = path.basename(pathname);
        if (allowedFile.test(fileName)) {
            const [_, appType, appId, __, logType, ___] = fileName.split(/\.|--/);
            const numAppId = parseInt(appId);
            const data: ILogNodeTypesDataEvent = {
                channel: {appType, appId: numAppId, nodeId: this.nodeId},
                data: Array.from(this.logTypes.get(appType)?.get(numAppId)?.keys() || []),
            };
            const timer = setInterval(() => {
                const value = this.logTypes.get(appType)?.get(numAppId)?.get(logType);
                if (value) value.counter = 0;
            }, 1000);
            if (!this.logTypes.has(appType)) {
                const logTypesMap = new Map([[logType, {counter: 0, prevValue: "", timer}]]);
                const appIdMap = new Map([[numAppId, logTypesMap]]);
                this.logTypes.set(appType, appIdMap);
            } else if (!this.logTypes.get(appType)?.has(numAppId)) {
                const logTypesMap = new Map([[logType, {counter: 0, prevValue: "", timer}]]);
                this.logTypes.get(appType)?.set(numAppId, logTypesMap);
            } else if (!this.logTypes.get(appType)?.get(numAppId)?.has(logType)) {
                this.logTypes.get(appType)?.get(numAppId)?.set(logType, {counter: 0, prevValue: "", timer});
            }
            this.emit("dataTypes", data);
            this.createUntruckedFile(appType, numAppId, logType);
        }
    }

    private onFileChange(pathname: string) {
        const fileName = path.basename(pathname);
        if (allowedFile.test(fileName)) {
            const [_, appType, appId, appName, logType, ___] = fileName.split(/\.|--/);
            const numAppId = parseInt(appId);
            const stream = spawn("tail", `-n 1 ${this.appLogsPath}/${fileName}`.split(" "));
            stream.stdout.setEncoding("utf8");
            stream.stdout.on("data", this.onStreamData(appType, numAppId, logType, appName));
            stream.on("error", (error) => {
                this.log(`running "tail" error: ${error}`, true);
            });
            stream.on("close", (code) => {
                this.log(`stream closiing. Close code: ${code}`);
            });
        }
    }

    private onStreamData(appType: string, appId: number, logType: string, appName: string) {
        return (chunk: string) => {
            const created = new Date().getTime();
            const message: IAppLogMessage = {
                appType,
                appId,
                appName,
                created,
                message: chunk,
                nodeId: this.nodeId,
                subType: logType,
            };
            const logInfo = this.logTypes.get(appType)?.get(appId)?.get(logType);
            if (!logInfo) {
                this.log(`can not find this "${appType}-${appId}-${logType}" logInfo data`, true);
                return;
            }
            if (logInfo.prevValue === chunk) {
                return;
            }
            logInfo.counter += 1;
            if (logInfo.counter > 100) {
                this.log(`can not send log. Max logs credential is 100 logs per 1 seccond.`);
                return;
            }
            if (this.connected) {
                this.emit("dataType", message);
            } else {
                const fileName = `${appType}-${appId}-${logType}.json`;
                const filepath = `${this.appLogsPath}/${connectionLostDir}/${fileName}`;
                readFile(filepath, "utf8", (err, data) => {
                    if (err) {
                        this.log(`error occured while reading file ${filepath}. Error ${err.message}`);
                    } else {
                        const cleanData = JSON.parse(data) as Array<IAppLogMessage>;
                        cleanData.push(message);
                        const result = JSON.stringify(cleanData);
                        writeFile(filepath, result, (err) => {
                            if (err) {
                                this.log(`error occured while creating reserve file ${fileName}. Error ${err.message}`);
                            }
                        });
                    }
                });
            }
        };
    }

    // connection lost case
    private createUntruckedFile(appType: string, appId: number, logType: string) {
        const fileName = `${appType}-${appId}-${logType}.json`;
        const filePath = `${this.appLogsPath}/${connectionLostDir}/${fileName}`;
        if (existsSync(filePath)) {
            return;
        }
        open(filePath, "a", (err, fn) => {
            if (err) {
                this.log(`error occured while creating reserve file ${fileName}. Error ${err.message}`);
            } else {
                write(fn, "[]", (err) => {
                    if (err) {
                        this.log(`can not write to file ${fileName}`);
                    } else {
                        close(fn);
                    }
                });
            }
        });
    }

    private sendUntruckedMessages() {
        const readingPath = `${this.appLogsPath}/${connectionLostDir}`;
        readdir(readingPath, (err, files) => {
            if (err) {
                this.log(`can not read directory ${readingPath}`, true);
            } else {
                files.forEach((file) => {
                    readFile(`${readingPath}/${file}`, "utf8", (err, data) => {
                        if (err) {
                            this.log(`error occured while reading file ${file}. Error ${err.message}`);
                        } else {
                            const cleanData = JSON.parse(data) as Array<IAppLogMessage>;
                            this.emit("dataType", cleanData);
                            writeFile(`${readingPath}/${file}`, "[]", (err) => {
                                if (err) {
                                    this.log(`error occured while creating reserve file ${file}. Error ${err.message}`);
                                }
                            });
                        }
                    });
                });
            }
        });
    }

    protected override onDisconnected(reason: string): void {
        super.onDisconnected(reason);
        this.connected = false;
    }

    private isTrashData(data: string, filename: string) {
        if (filename === this.sysLogsPath) {
            return this.excludeSysLogRegexp?.test(data);
        } else {
            return this.excludeAppLogRegexp?.test(data);
        }
    }
}
