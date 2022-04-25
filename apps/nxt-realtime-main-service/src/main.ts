import { MainServiceServer } from '@socket/main-service-server';
import { LoggerServiceModule } from '@socket/main-service-modules-logger';
import { TeranexServiceModule } from '@socket/main-service-modules/teranex';
import { RedisServiceModule } from '@socket/main-service-modules-redis';
import { Thumbnails } from '@socket/main-service-modules/thumbnails';
import * as config from './assets/config.json';

const server = new MainServiceServer(1987);
const modules = [
    // new LoggerServiceModule('logger'),
    // new TeranexServiceModule('teranex'),
    // Thumbnails constructor params
    // name: string,
    // port: number,
    // host: string,
    // key: string,
    // cert: string
    new Thumbnails('thumb', 3000, 'localhost', config.ssl.key, config.ssl.crt),
];

modules.forEach((module) => server.registerModule(module));
