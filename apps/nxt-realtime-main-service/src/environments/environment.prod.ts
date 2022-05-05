export const environment = {
    production: true,
    ssl: {
        key: "/etc/pki/tls/private/nextologies.com.key",
        cert: "/etc/pki/tls/certs/nextologies_full.crt",
        ca: "/etc/pki/tls/certs/gd_bundle-g2-g1.crt",
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
        apiServerPort: 1988,
    },
};
