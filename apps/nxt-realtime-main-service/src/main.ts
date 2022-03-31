import { MainServiceServer } from '@socket/main-service-server';
import { LoggerServiceModule } from '@socket/main-service-modules-logger';
import { TeranexServiceModule } from '@socket/main-service-modules/teranex';

const server = new MainServiceServer(1987);
const modules = [
    new LoggerServiceModule('logger'),
    new TeranexServiceModule('teranex'),
];
modules.forEach((module) => server.registerModule(module));
