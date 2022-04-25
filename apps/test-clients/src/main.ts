import { loggerTestRun } from './app/logger-test';
import { teranexTestRun } from './app/teranex-test';
import { reddisTestClient } from './app/reddis-test';
import { thumbnailTestClient } from './app/thumbnails-test';

const mainServiceUrl = 'https://qa.nextologies.com:1987';

// loggerTestRun(mainServiceUrl);
// teranexTestRun(mainServiceUrl);

thumbnailTestClient('http://localhost:1987/');
