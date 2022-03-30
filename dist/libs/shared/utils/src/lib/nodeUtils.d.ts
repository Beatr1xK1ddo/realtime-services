declare function exec(cmd: string): Promise<any>;
declare function getNodeId(): Promise<number>;
declare function currentTime(): number;
declare function getCache(key: any, saveCallback: any): Promise<any>;
export { exec, getNodeId, currentTime, getCache };
