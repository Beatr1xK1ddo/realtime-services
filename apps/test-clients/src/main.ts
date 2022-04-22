import { loggerTestRun } from './app/logger-test';
import { teranexTestRun } from './app/teranex-test';
import { reddisTestClient } from './app/reddis-test';

const mainServiceUrl = 'https://qa.nextologies.com:1987';

// loggerTestRun(mainServiceUrl);
// teranexTestRun(mainServiceUrl);

reddisTestClient(mainServiceUrl);
