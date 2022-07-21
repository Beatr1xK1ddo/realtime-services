export const environment = {
    production: false,
    loggingModule: {
        name: "logging",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/logging",
        appsLogsDir: "/home",
        sysLogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"],
        },
    },
    teranex: {
        name: "teranex",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/teranex",
    },
    bmddModule: {
        name: "bmdd",
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/bmdd",
    },
};
