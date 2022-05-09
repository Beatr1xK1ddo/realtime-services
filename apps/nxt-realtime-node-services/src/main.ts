import {getNodeId} from "@socket/shared-utils";
import {LoggerNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";

import * as config from "./config.json";
import {HyperdeckNodeService} from "@socket/node-services/hyperdeck";

const {
    logAgent: {applogDir, syslogFile, excludeMessages, serviceUrl: loggerServiceUrl},
    teranex: {serviceUrl: teranexServiceUrl},
} = config;

// getNodeId().then((id) => {
//     if (id === null) return;
//     new LoggerNodeService("Logger", id, loggerServiceUrl, applogDir, syslogFile, excludeMessages);
//     new TeranexNodeService("Teranex", id, teranexServiceUrl);
// });
new HyperdeckNodeService("HyperdeckNode", 1337, "http://localhost:9000/hyperdeck");
