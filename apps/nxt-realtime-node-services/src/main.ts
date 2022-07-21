import {nodeUtils} from "@socket/shared-utils";
import {LoggingNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {BmddNodeService} from "@socket/node-services-bmdd";

import {environment} from "./environments/environment";

const {
    logging: {name: loggingServiceName, appsLogsDir, sysLogFile, excludeMessages, serviceUrl: loggingServiceUrl},
    teranex: {name: teranexServiceName, serviceUrl: teranexServiceUrl},
    bmdd: {name: bmddServiceName, serviceUrl: bmddServiceUrl},
} = environment;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    new LoggingNodeService(loggingServiceName, id, loggingServiceUrl, appsLogsDir, sysLogFile, excludeMessages);
    new TeranexNodeService(teranexServiceName, id, teranexServiceUrl);
    new BmddNodeService(bmddServiceName, id, bmddServiceUrl);
});
