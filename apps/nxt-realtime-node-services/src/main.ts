import {nodeUtils} from "@socket/shared-utils";
import {LoggingNodeService} from "@socket/node-services-logger";
import {TeranexNodeService} from "@socket/node-services-teranex";
import {BmddNodeService} from "@socket/node-services-bmdd";

import {environment} from "./environments/environment";

const {
    loggingService: {enabled: loggingServiceEnabled, name: loggingServiceName, appsLogsDir, sysLogFile, excludeMessages, serviceUrl: loggingServiceUrl},
    teranexService: {enabled: teranexServiceEnabled, name: teranexServiceName, serviceUrl: teranexServiceUrl},
    bmddService: {enabled: bmddServiceEnabled, name: bmddServiceName, serviceUrl: bmddServiceUrl},
} = environment;

nodeUtils.getNodeId().then((id) => {
    if (id === null) return;
    if (loggingServiceEnabled) new LoggingNodeService(loggingServiceName, id, loggingServiceUrl, appsLogsDir, sysLogFile, excludeMessages);
    if (teranexServiceEnabled) new TeranexNodeService(teranexServiceName, id, teranexServiceUrl);
    if (bmddServiceEnabled) new BmddNodeService(bmddServiceName, id, bmddServiceUrl);
});
