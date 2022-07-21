import * as path from "path";
import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import {FSWatcher, watch} from "chokidar";
import {createReadStream, existsSync, mkdirSync, promises as fs} from "fs";
import {createInterface} from "readline";

import {NodeService} from "@socket/shared/entities";
import {Common, LoggingService} from "@socket/shared-types";
import EServiceLogType = LoggingService.EServiceLogType;

const connectionLostDir = "backup";

const appLogFile = /real--[a-z0-9_]+--[0-9]+--[a-z0-9_]+--[a-z0-9_]+.log$/i;

export class LoggingNodeService extends NodeService {
    private appLogsPath: string;
    private sysLogsPath: string;
    private excludeAppLogRegexp?: RegExp;
    private excludeSysLogRegexp?: RegExp;

    private appsLogsFiles: Set<LoggingService.ILogFile>;
    private appsLogsTypes: Map<Common.IAppType, Map<Common.IAppId, Set<LoggingService.IAppLogType>>>;
    private tails: Map<LoggingService.ILogFile, ChildProcessWithoutNullStreams>;
    private watcher?: FSWatcher;

    constructor(name: string, nodeId: number, url: string, appLogsPath: string, sysLogsPath: string, exclude?: any) {
        super(name, nodeId, url);
        this.mainServiceConnectionActive = false;

        this.appLogsPath = appLogsPath;
        this.sysLogsPath = sysLogsPath;

        if (!existsSync(`${this.appLogsPath}/${connectionLostDir}`)) {
            mkdirSync(`${this.appLogsPath}/${connectionLostDir}`);
        }
        if (exclude) {
            this.excludeAppLogRegexp = new RegExp(`(${exclude?.applog.join("|")})`, "i");
            this.excludeSysLogRegexp = new RegExp(`(${exclude?.syslog.join("|")})`, "i");
        }

        this.appsLogsFiles = new Set<LoggingService.ILogFile>();
        this.appsLogsTypes = new Map<Common.IAppType, Map<Common.IAppId, Set<LoggingService.IAppLogType>>>();
        this.tails = new Map<LoggingService.ILogFile, ChildProcessWithoutNullStreams>();
        this.initLogsWatching();
    }

    //watching handling
    private async initLogsWatching() {
        await this.handleAppsLogsFiles();
        // this.watcher = watch([this.appLogsPath, this.sysLogsPath]);
        this.watcher = watch([this.appLogsPath], {
            ignoreInitial: true,
            followSymlinks: false,
        });
        this.watcher.on("add", this.handleFileAdd.bind(this));
        this.watcher.on("change", this.handleFileChange.bind(this));
    };

    private async handleAppsLogsFiles() {
        const files = await fs.readdir(this.appLogsPath);
        this.log(`got thees files ${files} after reading ${this.appLogsPath}, updating context`);
        files.forEach(fileName => {
            if (appLogFile.test(fileName)) {
                this.log(`${fileName} seems to be an app log, processing`);
                //save file name to this.appsLogsFiles: Set<LoggingService.ILogFile>
                this.appsLogsFiles.add(fileName);
                //add log type to this.appsLogsTypes: Map<Common.IAppType, Map<Common.IAppId, Set<LoggingService.IAppLogType>>>
                const {appType, appId, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
                const appTypeMap = this.appsLogsTypes.get(appType) ?? new Map<Common.IAppId, Set<LoggingService.IAppLogType>>();
                const appLogsTypes = appTypeMap.get(appId) ?? new Set<LoggingService.IAppLogType>();
                appLogsTypes.add(appLogType);
                appTypeMap.set(appId, appLogsTypes);
                this.appsLogsTypes.set(appType, appTypeMap);
            }
        })
    };

    private async handleFileAdd(pathname: string) {
        const fileName = path.basename(pathname);
        if (appLogFile.test(fileName)) {
            await this.handleAppsLogsFiles();
            const {appType, appId, appName, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
            const records: Array<LoggingService.INodeBasicLogRecord> = [];
            const created = new Date().getTime();
            await LoggingNodeService.processFileLineByLine(pathname, (message: string) => {
                records.push({created, message});
            });
            for (let i = 0; i < records.length; i += 100) {
                const resultChunk = records.slice(i, i + 100);
                const appLogRecordsEvent: LoggingService.INodeAppLogRecordsEvent = {
                    nodeId: this.nodeId,
                    serviceLogType: EServiceLogType.app,
                    appType, appId, appName, appLogType,
                    records: resultChunk,
                };
                if (this.mainServiceConnectionActive) {
                    this.emit("data", appLogRecordsEvent);
                } else {
                    //todo: put it into backup file
                }
            }
            this.createBackupFile(appType, appId, appLogType);
        } else {
            //todo: handle sys logs
        }
    };

    private handleFileChange(pathname: string) {
        const fileName = path.basename(pathname);
        if (appLogFile.test(fileName) && !this.tails.has(fileName)) {
            this.log(`${fileName} has not tail running, spawning`);
            const {appType, appId, appName, appLogType} = LoggingNodeService.readAppMetadataFromFileName(fileName);
            //todo: is there a way to do it better? do we need to close this read stream manually?
            const stream = spawn("tail", ["-f", "-n", "1", `${this.appLogsPath}/${fileName}`]);
            stream.stdout.setEncoding("utf8");
            stream.stdout.on("data", this.handleLogRecord(appType, appId, appName, appLogType));
            stream.on("error", (error) => {
                this.log(`${fileName} tail error: ${error}`, true);
            });
            stream.on("close", (code) => {
                this.log(`${fileName} tail stream closed: ${code}`);
                //todo: do we need to restart this?
            });
            this.tails.set(fileName, stream);
        } else {
            //todo: handle sys logs
        }
    };

    private handleLogRecord(appType: Common.IAppType, appId: Common.IAppId, appName: string, appLogType: LoggingService.IAppLogType) {
        return (message: string) => {
            const created = new Date().getTime();
            const appLogRecordsEvent: LoggingService.INodeAppLogRecordsEvent = {
                nodeId: this.nodeId,
                serviceLogType: EServiceLogType.app,
                appType, appId, appName, appLogType,
                records: [{created, message}],
            };
            if (this.mainServiceConnectionActive) {
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
    };

    //main service handling
    protected override async onConnected() {
        super.onConnected();
        const appsLogsTypes: Array<LoggingService.IAppLogsTypes> = [];
        this.appsLogsTypes.forEach((appsMap, appType) => {
            appsMap.forEach((appLogsTypes, appId) => {
                appsLogsTypes.push({appType, appId, appLogsTypes: Array.from(appLogsTypes)});
            })
        })
        const nodeInitEvent: LoggingService.INodeInitEvent = {
            nodeId: this.nodeId,
            appsLogsTypes,
        };
        this.emit("initNode", nodeInitEvent);
        //todo: handle pending messages if anny
        // await this.handlePendingMessages();
    };

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

    private isTrashData(data: string, filename: string) {
        if (filename === this.sysLogsPath) {
            return this.excludeSysLogRegexp?.test(data);
        } else {
            return this.excludeAppLogRegexp?.test(data);
        }
    };
}
