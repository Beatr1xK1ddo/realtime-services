// import { getNodeId } from '@socket/shared-utils';

import { LoggerNodeService } from '@socket/node-services-logger';
import { TeranexNodeService } from '@socket/node-services-teranex';

import * as config from './config.json';

const nodeId = 356;

const {
    logAgent: {
        applogDir,
        syslogFile,
        excludeMessages,
        serviceUrl: loggerServiceUrl,
    },
    teranex: { serviceUrl: teranexServiceUrl },
} = config;

new LoggerNodeService(
    nodeId,
    loggerServiceUrl,
    applogDir,
    syslogFile,
    excludeMessages
).init();
new TeranexNodeService(nodeId, teranexServiceUrl).init();
