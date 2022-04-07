import { loggerTestRun } from './app/logger-test';
import { teranexTestRun } from './app/teranex-test';

const mainServiceUrl = 'https://qa.nextologies.com:1987';

loggerTestRun(mainServiceUrl);
teranexTestRun(mainServiceUrl);
