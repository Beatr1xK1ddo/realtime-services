import {LoggerProducer} from "@socket/producers/logger";

import * as config from "./config.json";

const {logAgent: {applogDir, syslogFile, excludeMessages}} = config;

const producer = new LoggerProducer(15456451, 'ws://qa.nextologies.com:1807/logger', applogDir, syslogFile, excludeMessages);
