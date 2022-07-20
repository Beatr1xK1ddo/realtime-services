import * as path from "path";
import {exec, spawn} from "child_process";
import {FSWatcher, watch} from "chokidar";
import {close, createReadStream, existsSync, mkdirSync, open, promises as fs, readFile, write, writeFile} from "fs";
import {createInterface} from "readline";

import {NodeService} from "@socket/shared/entities";
import {Common, IAppLogMessage, ILogNodeTypesDataEvent, LoggingService} from "@socket/shared-types";
import EServiceLogType = LoggingService.EServiceLogType;

// import EServiceLogType = LoggingService.EServiceLogType;

const sysLog = "system.ts";
const connectionLostDir = "historyLog";

type ILogTypeInfo = {
    prevValue: string;
    counter: number;
    timer: NodeJS.Timer;
};

const appLogFile = /real--[a-z0-9_]+--[0-9]+--[a-z0-9_]+--[a-z0-9_]+.log$/i;

export class LoggingNodeService extends NodeService {
    private appLogsPath: string;
    private sysLogsPath: string;
    private excludeAppLogRegexp?: RegExp;
    private excludeSysLogRegexp?: RegExp;
    private watcher?: FSWatcher;

    private connected: boolean;
    private logTypes: Map<Common.IAppType, Map<Common.IAppId, Set<LoggingService.IAppLogType>>>;
    // private logTypes: Map<Common.IAppType, Map<Common.IAppId, Map<string, ILogTypeInfo>>>;

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
    protected override async onConnected() {
        super.onConnected();
        this.connected = true;
        await this.updateAppsLogsTypes();
        const appsLogsTypes: Array<LoggingService.IAppLogsTypes> = [];
        this.logTypes.forEach((appsMap, appType) => {
            appsMap.forEach((appLogsTypes, appId) => {
                appsLogsTypes.push({appType, appId, appLogsTypes: Array.from(appLogsTypes)});
            })
        })
        const nodeInitEvent: LoggingService.INodeInitEvent = {
            nodeId: this.nodeId,
            appsLogsTypes,
        };
        this.emit("initNode", nodeInitEvent);
        // await this.handlePendingMessages();
        this.startLogsMonitoring();
    }

    // watcher file handlers
    private startLogsMonitoring() {
        // this.watcher = watch([this.appLogsPath, this.sysLogsPath]);
        this.watcher = watch([this.appLogsPath]);
        this.watcher.on("add", this.handleFileAdd.bind(this));
        this.watcher.on("change", this.handleFileChange.bind(this));
    }

    private async handleFileAdd(pathname: string) {
        this.log(`handleFileAdd ${pathname}`);
        const fileName = path.basename(pathname);
        if (appLogFile.test(fileName)) {
            const {appType, appId, appName, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
            this.log(`handleFileAdd ${appLogType} ${appId} ${appName} ${appLogType} `);
            const appLogRecordsEvent: LoggingService.INodeAppLogRecordsEvent = {
                nodeId: this.nodeId,
                serviceLogType: EServiceLogType.app,
                appType, appId, appName, appLogType,
                records: [],
            };
            const created = new Date().getTime();
            await LoggingNodeService.processFileLineByLine(pathname, (message: string) => {
                appLogRecordsEvent.records.push({created, message});
            });
            appLogRecordsEvent.records = appLogRecordsEvent.records.slice(0, 100);
            this.emit("data", appLogRecordsEvent);
            this.createBackupFile(appType, appId, appLogType);
        } else {
            //todo: handle sys logs
        }
    }

    private handleFileChange(pathname: string) {
        const fileName = path.basename(pathname);
        if (appLogFile.test(fileName)) {
            const {appType, appId, appName, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
            //todo: is there a way to do it better? do we need to close this read stream manually?
            const stream = spawn("tail", ["-n", "1", `${this.appLogsPath}/${fileName}`]);
            stream.stdout.setEncoding("utf8");
            stream.stdout.on("data", this.handleLogRecord(appType, appId, appName, appLogType));
            stream.on("error", (error) => {
                this.log(`running "tail" error: ${error}`, true);
            });
            stream.on("close", (code) => {
                this.log(`stream closing. Close code: ${code}`);
            });
        }
    }

    private handleLogRecord(appType: Common.IAppType, appId: Common.IAppId, appName: string, appLogType: LoggingService.IAppLogType) {
        return (message: string) => {
            const created = new Date().getTime();
            const appLogRecordsEvent: LoggingService.INodeAppLogRecordsEvent = {
                nodeId: this.nodeId,
                serviceLogType: EServiceLogType.app,
                appType, appId, appName, appLogType,
                records: [{created, message}],
            };
            if (this.connected) {
                this.emit("data", appLogRecordsEvent);
            } else {
                //todo: handle backup
/*
                const fileName = `${appType}-${appId}-${appLogType}.json`;
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
*/
            }
        };
    }

    // connection lost case
    private createBackupFile(appType: Common.IAppType, appId: Common.IAppId, appLogType: LoggingService.IAppLogType) {
/*
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
*/
    }

    //handle logs
    private async handlePendingMessages() {
        //todo: rewrite this in proper way
/*
        const readingPath = `${this.appLogsPath}/${connectionLostDir}`;
        try {
            const pendingLogs = await readdir(readingPath);
        } catch (e) {

        }

        readdir(readingPath, (err, files) => {
            if (err) {
                this.log(`can not read directory ${readingPath}`, true);
            } else {
                files.forEach((file) => {
                    readFile(`${readingPath}/${file}`, "utf8", (err, data) => {
                        if (err) {
                            this.log(`error occurred while backup file reading ${file}. Error ${err.message}`);
                        } else {
                            const {appType, appId, appName, appLogType} = LoggingNodeService.readAppMetadataFromFileName(file);
                            const records = data.toString().replace(/\r\n/g,'\n').split('\n');
                            if (records.length) {
                                const event: LoggingService.INodeAppLogRecordsEvent = {
                                    nodeId: this.nodeId,
                                    appType, appId, appName, appLogType,
                                    serviceLogType: EServiceLogType.app,
                                    records: records.map(LoggingNodeService.mapTextLogRecordToBasicLogRecord),
                                }
                                this.emit("data", event);
                                writeFile(`${readingPath}/${file}`, "", (err) => {
                                    if (err) {
                                        this.log(`error occurred while backup file cleanup ${file}. Error ${err.message}`);
                                    }
                                });
                            }
                        }
                    });
                });
            }
        });
*/
    }

    //service specific
    private static readAppMetadataFromFileName(fileName: string) {
        /*real--ipbe--892--gleb_logs_test--Encoder.log*/
        const [_, appType, appId, appName, appLogType] = fileName.split(/\.|--/);
        return {appType, appId: +appId, appName, appLogType};
    };

    private static mapTextLogRecordToBasicLogRecord(record: string):  LoggingService.INodeBasicLogRecord {
        const [created, message] = record.split("-||-");
        return {
            created: +created,
            message
        };
    };

    private static async processFileLineByLine(fileName: string, onNewLine: (line: string) => void) {
        const fileStream = createReadStream(fileName);
        const readInterface = createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        for await (const line of readInterface) {
            onNewLine(line);
        }
    };

    private async updateAppsLogsTypes() {
        const files = await fs.readdir(this.appLogsPath);
        files.forEach(fileName => {
            const {appType, appId, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
            //Map<Common.IAppType, Map<Common.IAppId, Set<LoggingService.IAppLogType>>>
            const appTypeMap = this.logTypes.get(appType) ?? new Map<Common.IAppId, Set<LoggingService.IAppLogType>>();
            const appLogsTypes = appTypeMap.get(appId) ?? new Set<LoggingService.IAppLogType>();
            appLogsTypes.add(appLogType);
            appTypeMap.set(appId, appLogsTypes);
            this.logTypes.set(appType, appTypeMap);
        })
    }

    protected override onDisconnected(reason: string): void {
        super.onDisconnected(reason);
        this.connected = false;
    };

    private isTrashData(data: string, filename: string) {
        if (filename === this.sysLogsPath) {
            return this.excludeSysLogRegexp?.test(data);
        } else {
            return this.excludeAppLogRegexp?.test(data);
        }
    };
}
