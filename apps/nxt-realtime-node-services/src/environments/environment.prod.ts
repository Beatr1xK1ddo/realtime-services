export const environment = {
    production: true,
    logging: {
        name: "logging",
        serviceUrl: "https://qa.nextologies.com:1987/logging",
        appsLogsDir: "/home/dv2/data/logs/",
        sysLogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"],
        },
    },
    teranex: {
        serviceUrl: "https://cp.nextologies.com:1987/teranex",
    },
    bmdd: {
        serviceUrl: "https://cp.nextologies.com:1987/bmdd",
    },
};
