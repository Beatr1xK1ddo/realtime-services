export const environment = {
    production: false,
    ssl: {
        key: "/src/nextologies.com.key",
        cert: "/src/nextologies_full.crt",
        ca: "/Users/bender/code/tls/gd_bundle-g2-g1.crt",
    },
    mainService: {
        port: 1987,
    },
    loggerService: {
        name: "logger",
    },
    teranexService: {
        name: "teranex",
    },
    redisService: {
        name: "redis",
        url: "redis://:c709bdf5f5c2be2a8a1e8da19bf88400a21421ec@38.121.75.100:80",
    },
    thumbnailsService: {
        name: "thumbnails",
        apiHttpServerPort: 30680,
        apiHttpsServerPort: 30681,
    },
};
