import pino, {Level, Logger} from "pino";

type ITransportOptions = {
    [key: string]: any;
};

export type IBasicLoggerOptions = {
    name: string;
    path: string;
    level: Level;
};

export class BasicLogger {
    public name?: string;
    public log: Logger;

    constructor(name?: string, level?: Level, path?: string) {
        this.name = name;
        this.log = BasicLogger.createTransport(level, path);
    }

    private static createTransport(level?: Level, path?: string) {
        const targets = [
            {
                target: "pino-pretty",
                options: {
                    translateTime: "SYS:dd:mm:yy HH:MM:ss",
                    ignore: "hostname",
                } as ITransportOptions,
                level: level || "trace",
            },
        ];

        if (path) {
            targets.push({
                target: "pino/file",
                options: {
                    destination: path,
                },
                level: level || "trace",
            });
        }

        const transport = pino.transport({
            targets: targets,
        });
        return pino(transport);
    }
}
