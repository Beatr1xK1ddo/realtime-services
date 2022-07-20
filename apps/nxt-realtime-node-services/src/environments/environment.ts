export const environment = {
    production: false,
    logging: {
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
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/teranex",
    },
    bmdd: {
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/bmdd",
    },
};
