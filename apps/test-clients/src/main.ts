import {loggerTestRun} from "./app/logger-test";
import {teranexTestRun} from "./app/teranex-test";
import {redisTestRun} from "./app/reddis-test";
import {thumbnailTestClient} from "./app/thumbnails-test";
import {hyperdeckTestRun} from "./app/hyperdeck-test";
import {hlsTestRun} from "./app/hls-test";
import {bmddTest} from "./app/bmdd-test";

const mainServiceUrl = "https://qa.nextologies.com:1987";
// const mainServiceUrl = "https://nxt-dev-env.nextologies.com:1987";

loggerTestRun(mainServiceUrl);
// hlsTestRun("http://localhost:1987");

// loggerTestRun(mainServiceUrl);
// teranexTestRun(mainServiceUrl);

// loggerTestRun("http://localhost:1987");
// thumbnailTestClient('http://localhost:1987/');
// hyperdeckTestRun("http://localhost:9000/");
// redisTestRun("http://localhost:1987");
