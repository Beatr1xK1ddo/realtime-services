export const environment = {
    production: true,
    loggingService: {
        enabled: true,
        name: "logging",
        serviceUrl: "https://cp.nextologies.com:1987/logging",
        appsLogsDir: "/home/dv2/data/logs/",
        sysLogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"],
        },
    },
    teranexService: {
        enabled: true,
        name: "teranex",
        serviceUrl: "https://cp.nextologies.com:1987/teranex",
    },
    bmddService: {
        enabled: true,
        name: "bmdd",
        serviceUrl: "https://cp.nextologies.com:1987/bmdd",
    },
};
