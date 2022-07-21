export const environment = {
    production: true,
    loggingModule: {
        name: "logging",
        serviceUrl: "https://cp.nextologies.com:1987/logging",
        appsLogsDir: "/home/dv2/data/logs/",
        sysLogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"],
        },
    },
    teranex: {
        name: "teranex",
        serviceUrl: "https://cp.nextologies.com:1987/teranex",
    },
    bmddModule: {
        name: "bmdd",
        serviceUrl: "https://cp.nextologies.com:1987/bmdd",
    },
};
