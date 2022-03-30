import { DataProducer, ELogTypes } from '@socket/interfaces';
export declare class LoggerProducer extends DataProducer {
    private nodeId;
    private appLogsPath;
    private sysLogsPath;
    private excludeAppLogRegexp;
    private excludeSysLogRegexp;
    private watcher;
    private mapFiles;
    constructor(nodeId: number, url: string, appLogsPath: string, sysLogsPath: string, exclude: any);
    init(): void;
    isTrashData(data: string, filename: string): boolean;
    _watch(filename: string): void;
    _watchAll(): void;
    sendLog(msg: string, info: any): void;
    _unwatchAll(): void;
    _unwatch(filename: string): void;
    _parseFilename(filename: string): {
        type: ELogTypes;
        appId?: undefined;
        appType?: undefined;
        appName?: undefined;
        subType?: undefined;
    } | {
        type: ELogTypes;
        appId: string;
        appType: string;
        appName: string;
        subType: string;
    } | {
        type: null;
        appId?: undefined;
        appType?: undefined;
        appName?: undefined;
        subType?: undefined;
    };
    debug(message: string): void;
    _onMessage(req: any): Promise<void>;
}
