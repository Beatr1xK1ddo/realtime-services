export const environment = {
    production: false,
    loggingService: {
        enabled: true,
        name: "logging",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/logging",
        appsLogsDir: "/home",
        sysLogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"],
        },
    },
    teranexService: {
        enabled: true,
        name: "teranex",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/teranex",
    },
    bmddService: {
        enabled: true,
        name: "bmdd",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/bmdd",
    },
};
