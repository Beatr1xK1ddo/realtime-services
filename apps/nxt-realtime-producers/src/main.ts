import {LoggerProducer} from "@socket/producers/logger";
import {getNodeId} from "@socket/utils";

import * as config from "./config.json";

const {logAgent: {applogDir, syslogFile, excludeMessages, serviceUrl}} = config;
getNodeId().then(id => {
    if (id === null) return;
    new LoggerProducer(id, serviceUrl, applogDir, syslogFile, excludeMessages).init();
});
