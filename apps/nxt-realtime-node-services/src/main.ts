import { getNodeId } from '@socket/shared-utils';
import { LoggerNodeService } from '@socket/node-services-logger';
import { TeranexNodeService } from '@socket/node-services-teranex';

import * as config from './config.json';

const {
    logAgent: { applogDir, syslogFile, excludeMessages, serviceUrl: loggerServiceUrl },
    teranex: { serviceUrl: teranexServiceUrl },
} = config;

getNodeId().then((id) => {
    if (id === null) return;
    new LoggerNodeService('Logger', id, loggerServiceUrl, applogDir, syslogFile, excludeMessages);
    new TeranexNodeService('Teranex', id, teranexServiceUrl);
});
// new LoggerNodeService('Logger', 1337, 'http://localhost:1987/logger', './app_log.log', './sys_log.log');
