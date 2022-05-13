import {MainServiceServer} from "@socket/main-service-server";
import {LoggerServiceModule} from "@socket/main-service-modules-logger";
import {TeranexServiceModule} from "@socket/main-service-modules/teranex";
import {RedisServiceModule} from "@socket/main-service-modules-redis";
import {ThumbnailsModule} from "@socket/main-service-modules/thumbnails";

import {environment} from "./environments/environment";

const {ssl, mainService, loggerService, teranexService, redisService, thumbnailsService} = environment;

const server = new MainServiceServer(mainService.port, {ssl});
const modules = [
    new LoggerServiceModule(loggerService.name),
    new TeranexServiceModule(teranexService.name),
    new RedisServiceModule(redisService.name, {url: redisService.url}),
    new ThumbnailsModule(thumbnailsService.name, {
        apiServerPort: thumbnailsService.apiServerPort,
        apiServerSsl: ssl,
    }),
];

modules.forEach((module) => server.registerModule(module));
