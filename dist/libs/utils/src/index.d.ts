/// <reference types="node" />
declare const _default: {
    isValidIP(ip: any): any;
    getHostNodeID(): any;
    generateToken(): any;
    getReqQuery(req: any): import("querystring").ParsedUrlQuery;
    resolvePath(filepath: any): string;
    currentTime(): number;
    exec(cmd: string): Promise<unknown>;
    getCache(key: string, saveCallback: any): Promise<any>;
    log(message: string): void;
    getPort(url: string): string;
};
export default _default;
