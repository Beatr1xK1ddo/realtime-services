export const environment = {
    production: false,
    logAgent: {
        serviceUrl: "https://nxt-dev-env.nextologies.com:1987/logger",
        applogDir: "./ssl",
        syslogFile: "./ssl/path",
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
