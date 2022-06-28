export const environment = {
    production: false,
    logAgent: {
        serviceUrl: "https://localhost:1987:1987/logger",
        applogDir: "/home/dv2/data/logs/real--*.log",
        syslogFile: "/var/log/syslog",
        excludeMessages: {
            applog: ["ultragrid", "cesnet"],
            syslog: ["cron", "postfix"]
        }
    },
    teranex: {
        serviceUrl: "https://localhost:1987/teranex"
    },
    bmdd: {
        serviceUrl: "https://localhost:1987:1987/bmdd"
    },
};
