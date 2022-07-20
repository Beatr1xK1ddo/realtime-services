import {MainServiceServer} from "@socket/main-service-server";
import {LoggingModule} from "@socket/main-service-modules-logger";
import {TeranexServiceModule} from "@socket/main-service-modules/teranex";
import {RedisServiceModule} from "@socket/main-service-modules-redis";
import {ThumbnailsModule} from "@socket/main-service-modules/thumbnails";
import {BmddServiceModule} from "@socket/main-service-modules-bmdd";

import {environment} from "./environments/environment";

const {ssl, mainService, logging, teranexService, redisService, thumbnailsService, bmdd} = environment;

const server = new MainServiceServer(mainService.port, {ssl});
const modules = [
    new LoggingModule(logging.name, {dbUrl: logging.url}),
/*
    new TeranexServiceModule(teranexService.name),
    new RedisServiceModule(redisService.name, {url: redisService.url}),
    new ThumbnailsModule(thumbnailsService.name, {
        apiHttpsServerPort: thumbnailsService.apiHttpsServerPort,
        apiHttpServerPort: thumbnailsService.apiHttpServerPort,
        apiServerSsl: ssl,
    }),
    new BmddServiceModule(bmdd.name),
*/
];

modules.forEach((module) => server.registerModule(module));
