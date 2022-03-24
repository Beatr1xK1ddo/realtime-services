import {NxtRealtimeServer} from "@socket/server";
import {Logger} from "@socket/modules/logger";

const server = new NxtRealtimeServer(1807);
const logger = new Logger('logger');
server.reg(logger);
