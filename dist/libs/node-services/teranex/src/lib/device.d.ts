export declare class TeranexDevice {
    private timeout;
    private ip;
    private port;
    private response;
    private socket?;
    busy: boolean;
    constructor(ip: string, port: number);
    connect(): Promise<unknown>;
    command(cmd: string, timeout?: number): Promise<unknown>;
    destroy(): void;
}
