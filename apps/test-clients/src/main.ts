import {loggerTestRun} from "./app/logger-test";
import {teranexTestRun} from "./app/teranex-test";
import {reddisTestClient} from "./app/reddis-test";
import {thumbnailTestClient} from "./app/thumbnails-test";
import {hyperdeckTestRun} from "./app/hyperdeck-test";

const mainServiceUrl = "https://qa.nextologies.com:1987";

// loggerTestRun(mainServiceUrl);
// teranexTestRun(mainServiceUrl);

// loggerTestRun("http://localhost:1987");
// thumbnailTestClient('http://localhost:1987/');
hyperdeckTestRun("http://localhost:9000/");
