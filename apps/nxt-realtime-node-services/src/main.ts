import {nodeUtils} from "@socket/shared-utils";
import {LoggingNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {BmddNodeService} from "@socket/node-services-bmdd";

import {environment} from "./environments/environment";

const {
    logging: {appsLogsDir, sysLogFile, name, excludeMessages, serviceUrl: loggerServiceUrl},
    teranex: {serviceUrl: teranexServiceUrl},
    bmdd: {serviceUrl: bmddServiceUrl},
} = environment;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    new LoggingNodeService(name, id, loggerServiceUrl, appsLogsDir, sysLogFile, excludeMessages);
    // new TeranexNodeService("Teranex", id, teranexServiceUrl);
    // new BmddNodeService("BMDD", id, bmddServiceUrl);
});
