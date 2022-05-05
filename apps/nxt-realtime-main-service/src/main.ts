import * as config from './assets/config.json';

import { MainServiceServer } from '@socket/main-service-server';
import { LoggerServiceModule } from '@socket/main-service-modules-logger';
import { TeranexServiceModule } from '@socket/main-service-modules/teranex';
import { RedisServiceModule } from '@socket/main-service-modules-redis';
import { ThumbnailsModule } from '@socket/main-service-modules/thumbnails';

const server = new MainServiceServer(config.mainService.port, { ssl: config.ssl });
const modules = [
    new LoggerServiceModule(config.loggerService.name),
    new TeranexServiceModule(config.teranexService.name),
    new RedisServiceModule(config.redisService.name, { url: config.redisService.url }),
    new ThumbnailsModule(config.thumbnailsService.name, { apiServerPort: config.thumbnailsService.apiServerPort, apiServerSsl: config.ssl }),
];
// const modules = [new LoggerServiceModule('logger')];

modules.forEach((module) => server.registerModule(module));
