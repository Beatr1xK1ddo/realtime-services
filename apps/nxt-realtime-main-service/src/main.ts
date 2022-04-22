import { MainServiceServer } from '@socket/main-service-server';
import { LoggerServiceModule } from '@socket/main-service-modules-logger';
import { TeranexServiceModule } from '@socket/main-service-modules/teranex';
import { RedisServiceModule } from '@socket/main-service-modules-redis';

const server = new MainServiceServer(1987);
const modules = [
    // new LoggerServiceModule('logger'),
    // new TeranexServiceModule('teranex'),
    new RedisServiceModule('reddis', '38.121.75.100:80'),
];
modules.forEach((module) => server.registerModule(module));
