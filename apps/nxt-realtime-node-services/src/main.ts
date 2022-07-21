import {nodeUtils} from "@socket/shared-utils";
import {LoggingNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {BmddNodeService} from "@socket/node-services-bmdd";

import {environment} from "./environments/environment";

const {
    loggingService: {name: loggingServiceName, appsLogsDir, sysLogFile, excludeMessages, serviceUrl: loggingServiceUrl},
    teranexService: {name: teranexServiceName, serviceUrl: teranexServiceUrl},
    bmddService: {name: bmddServiceName, serviceUrl: bmddServiceUrl},
} = environment;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    new LoggingNodeService(loggingServiceName, id, loggingServiceUrl, appsLogsDir, sysLogFile, excludeMessages);
    new TeranexNodeService(teranexServiceName, id, teranexServiceUrl);
    new BmddNodeService(bmddServiceName, id, bmddServiceUrl);
});
