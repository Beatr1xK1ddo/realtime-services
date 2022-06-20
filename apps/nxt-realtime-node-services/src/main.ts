import {nodeUtils} from "@socket/shared-utils";
import {LoggerNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {HlsAnalyzerNodeService} from "@socket/node-services/hls-analyzer";

import * as config from "./config.json";

const {
    logAgent: {applogDir, syslogFile, excludeMessages, serviceUrl: loggerServiceUrl},
    teranex: {serviceUrl: teranexServiceUrl},
} = config;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    new LoggerNodeService("Logger", id, loggerServiceUrl, applogDir, syslogFile, excludeMessages);
    new TeranexNodeService("Teranex", id, teranexServiceUrl);
});
