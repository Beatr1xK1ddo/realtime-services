import { MainServiceServer } from '@socket/main-service-server';
import { Logger } from '@socket/main-service-modules-logger';

const server = new MainServiceServer(1987);
const logger = new Logger('logger');
server.registerModule(logger);
