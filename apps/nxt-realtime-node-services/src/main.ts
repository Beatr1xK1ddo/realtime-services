import { LoggerNodeService } from '@socket/node-services-logger';
import { getNodeId } from '@socket/shared-utils';

import * as config from './config.json';

const {
    logAgent: { applogDir, syslogFile, excludeMessages, serviceUrl },
} = config;

getNodeId().then((id) => {
    if (id === null) return;
    new LoggerNodeService(
        id,
        serviceUrl,
        applogDir,
        syslogFile,
        excludeMessages
    ).init();
});
