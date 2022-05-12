import {loggerTestRun} from "./app/logger-test";
import {teranexTestRun} from "./app/teranex-test";
import {redisTestRun} from "./app/reddis-test";
import {thumbnailTestClient} from "./app/thumbnails-test";
import {hyperdeckTestRun} from "./app/hyperdeck-test";

const mainServiceUrl = "https://qa.nextologies.com:1987";

redisTestRun("redis://:c709bdf5f5c2be2a8a1e8da19bf88400a21421ec@38.121.75.100:80");

// loggerTestRun(mainServiceUrl);
// teranexTestRun(mainServiceUrl);

// loggerTestRun("http://localhost:1987");
// thumbnailTestClient('http://localhost:1987/');
// hyperdeckTestRun("http://localhost:9000/");
