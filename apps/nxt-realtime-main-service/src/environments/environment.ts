export const environment = {
    production: false,
    ssl: {
        key: "ssl/nextologies.com.key",
        cert: "ssl/nextologies_full.crt",
        ca: "/Users/bender/code/tls/gd_bundle-g2-g1.crt",
    },
    mainService: {
        port: 1987,
    },
    logging: {
        name: "logging",
        url: "mongodb://nxtroot1:sdfj338dsfk22fdskd399s9sss@158.106.77.8:80/logs?authSource=admin",
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
    bmdd: {
        name: "bmdd",
    },
};
