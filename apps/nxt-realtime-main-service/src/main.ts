import {MainServiceServer} from "@socket/main-service-server";
import {LoggingModule} from "@socket/main-service-modules-logger";
import {TeranexServiceModule} from "@socket/main-service-modules/teranex";
import {RedisServiceModule} from "@socket/main-service-modules-redis";
import {ThumbnailsModule} from "@socket/main-service-modules/thumbnails";
import {BmddServiceModule} from "@socket/main-service-modules-bmdd";

import {environment} from "./environments/environment";

const {ssl, mainService, loggingModule, teranexModule, redisModule, thumbnailsModule, bmddModule} = environment;

const server = new MainServiceServer(mainService.port, {ssl});
const modules = [
    new LoggingModule(loggingModule.name, {dbUrl: loggingModule.url}),
    new TeranexServiceModule(teranexModule.name),
    new RedisServiceModule(redisModule.name, {url: redisModule.url}),
    new ThumbnailsModule(thumbnailsModule.name, {
        apiHttpsServerPort: thumbnailsModule.apiHttpsServerPort,
        apiHttpServerPort: thumbnailsModule.apiHttpServerPort,
        apiServerSsl: ssl,
    }),
    new BmddServiceModule(bmddModule.name),
];

modules.forEach((module) => server.registerModule(module));
