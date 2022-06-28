import {nodeUtils} from "@socket/shared-utils";
import {LoggerNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {BmddNodeService} from "@socket/node-services-bmdd";

import {environment} from "./environments/environment";

const {
    logAgent: {applogDir, syslogFile, excludeMessages, serviceUrl: loggerServiceUrl},
    teranex: {serviceUrl: teranexServiceUrl},
    bmdd: {serviceUrl: bmddServiceUrl},
} = environment;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    new LoggerNodeService("Logger", id, loggerServiceUrl, applogDir, syslogFile, excludeMessages);
    new TeranexNodeService("Teranex", id, teranexServiceUrl);
    new BmddNodeService("BMDD", id, bmddServiceUrl);
});
