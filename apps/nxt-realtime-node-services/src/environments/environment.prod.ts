export const environment = {
    production: true,
    logAgent: {
        serviceUrl: "https://cp.nextologies.com:1987/logger",
        applogDir: "/home/dv2/data/logs/real--*.log",
        syslogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"]
        }
    },
    teranex: {
        serviceUrl: "https://cp.nextologies.com:1987/teranex"
    },
    bmdd: {
        serviceUrl: "https://cp.nextologies.com:1987/bmdd"
    },
};
