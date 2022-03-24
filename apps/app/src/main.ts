import { NxtRealtimeServer } from '@socket/server';
import { Logger } from '@socket/modules/logger';
import { LoggerProducer } from '@socket/producers/logger';

const server = new NxtRealtimeServer();
const logger = new Logger('logger');
const producer = new LoggerProducer(
    'http://localhost:3000/logger',
    './apps/app/src',
    11
);

server.reg(logger);
producer.init();
console.log(NxtRealtimeServer.namespaces.keys());
