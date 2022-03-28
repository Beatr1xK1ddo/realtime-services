import { IMainServiceModule } from '@socket/shared-types';
import { Socket, Namespace } from 'socket.io';
import * as mysql from 'mysql';
import * as conf from '../../config.json';
import * as _ from 'lodash';
import sqlQueries from './sql-queries';
import { IAppTypeKeyes } from './types';
import Redis from 'ioredis';
import * as util from '@socket/shared-utils';

export class Monitor implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private db?: mysql.Pool;
    private queries = sqlQueries;
    private redis: Redis;
    private lastRuntime?: number;

    constructor(name: string, urlRedis: string) {
        this.name = name;
        this.redis = new Redis(urlRedis);
    }

    async init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.onConnection.bind(this));
            this.db = await this.connectDb();
        } catch (e) {
            console.log('Ooops, :', e);
        }
    }

    private onConnection(socket: Socket): void {
        this.startMonitor();

        socket.on('data', this.onData.bind(this));

        socket.on('error', (error) => {
            console.log('Ooops: ', error);
        });
    }

    private connectDb(): Promise<mysql.Pool> {
        return new Promise((resolve, reject) => {
            const $con = mysql.createPool({
                host: 'localhost',
                user: 'root',
                password: 'lolwhat1337',
                database: 'test',
                connectionLimit: 10,
            });
            $con.getConnection((err) => {
                if (err) reject(err);
                resolve($con);
            });
        });
    }

    private onData() {
        console.log(11);
    }

    async startMonitor() {
        const alerts = await this.redis
            .smembers('monit-alerts')
            .catch((e: Error) => console.log(e));

        if (_.isEmpty(alerts)) {
            this.io?.send({
                sender: this.name,
                data: {
                    success: true,
                    data: null,
                },
            });
        } else {
            _.each(
                this.parseMonitorAlerts(alerts as string[]),
                (monitorApps, appType) => {
                    if (!this.queries[appType as IAppTypeKeyes]) return;

                    _.each(monitorApps, async (monitorApp) => {
                        try {
                            const rows = await this.db?.query(
                                this.queries[appType as IAppTypeKeyes]
                                    .selectQuery,
                                monitorApp
                            );

                            if (rows && rows?.values?.[0]) {
                                this.handleErrors(monitorApp, rows.values[0]);
                            }
                        } catch (e) {
                            console.log('Oooops: ', e);
                        }
                    });
                }
            );
        }

        this.lastRuntime = util.currentTime();
    }

    async handleErrors(app: any, sqlRec: any) {
        try {
            let results = [];
            let history = null;

            results = await Promise.all([
                this.redis.get(`${app.cachePrefix}-last-comeback`),
                this.redis.get(`${app.cachePrefix}-last-cc-comeback`),
            ]);

            const signalComebackTime = +results[0]!;
            const signalStabilizeTime = +results[1]!;

            if (sqlRec.haltUntil) {
                const query =
                    this.queries[app.appType as IAppTypeKeyes].updateQuery;
                this.db?.query(
                    query.replace('halt_comeback = false', 'halt_until = null'),
                    { appId: app.appId }
                );
            }

            if (signalComebackTime && signalStabilizeTime) {
                if (sqlRec.haltComeback) {
                    this.db?.query(
                        this.queries[app.appType as IAppTypeKeyes].updateQuery,
                        {
                            appId: app.appId,
                        }
                    );
                }

                this.sendData('restore', null, null, sqlRec);
            } else if (sqlRec.haltComeback) {
                this.sendData('restore', null, null, sqlRec);
            } else {
                results = await Promise.all([
                    this.redis.get(`${app.cachePrefix}-last-error`),
                    this.redis.get(`${app.cachePrefix}-last-cc-error`),
                ]);

                const signalLostTime = +results[0]!;
                const signalErrorTime = +results[1]!;

                if (signalLostTime) {
                    history = await util.getCache(app.uniqueID, () =>
                        this.fetchHistory(sqlRec)
                    );

                    this.sendData(
                        'status_error',
                        signalLostTime,
                        history,
                        sqlRec,
                        0
                    );
                } else if (signalErrorTime) {
                    results = await Promise.all([
                        this.redis.get(`${app.cachePrefix}-last-cc-amount`),
                        this.redis.get(
                            `${app.cachePrefix}-past-interval-cc-amount`
                        ),
                    ]);

                    history = await util.getCache(app.uniqueID, () =>
                        this.fetchHistory(sqlRec)
                    );

                    this.sendData(
                        'ts_errors',
                        signalErrorTime,
                        history,
                        sqlRec,
                        +results[0]! + '/' + +results[1]!
                    );
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    parseMonitorAlerts(alerts: string[]) {
        const result: any = {};

        _.each(alerts, (item: string) => {
            const data = item.split(';');

            if (!data.length || !data[0] || !data[1] || !data[2] || !data[3]) {
                return;
            }

            const appType = data[1];
            const appId = data[2];
            const nodeId = data[0];

            const nodeInfo = data[3].split(':');
            const nodeIp = nodeInfo ? nodeInfo[0] : null;
            const nodePort = nodeInfo ? nodeInfo[1] : null;

            if (!nodeIp || !nodePort) return;

            if (!result[appType]) {
                result[appType] = [];
            }

            result[appType].push({
                appType: appType,
                appId: appId,
                nodeId: nodeId,
                nodeIp: nodeIp,
                nodePort: nodePort,

                uniqueID: `${appType}-${appId}-${nodeId}-${nodeIp}-${nodePort}`,
                cachePrefix: item.replace(/;/gi, '-'),
                lastRuntime: this.lastRuntime,
            });
        });

        return result;
    }

    sendData(
        errorType: string,
        errorTime: number | null,
        errorHistory?: any,
        sqlRec?: any,
        replyCount?: any
    ) {
        const data = {
            appType: sqlRec.appType,
            appId: sqlRec.appId,
            appName: sqlRec.appName,

            nodeId: sqlRec.nodeId,
            nodeIp: sqlRec.nodeIp,
            nodePort: sqlRec.nodePort,
            nodeName: sqlRec.nodeName,
            nodeOffline: sqlRec.nodeOffline,

            errorType: errorType,
            errorTime: errorTime,
            errorHistory: errorHistory,

            companyId: sqlRec.companyId,
            lastCCErrors: replyCount || null,
        };

        this.io?.send({
            sender: this.name,
            data: {
                success: true,
                data: data,
            },
        });
    }

    fetchHistory(sqlRec: any) {
        const { appId, appType, nodeId, nodeIp, nodePort } = sqlRec;

        const fromTime = util.currentTime() - conf.live_monitor.history.depth;
        const toTime = util.currentTime();

        return util
            .exec(
                `php ${conf.live_monitor.history.bin} ${appType} ${appId} ${fromTime} ${toTime} ${nodeId} ${nodeIp} ${nodePort}`
            )
            .catch((e: Error) => console.log('Ooops: ', e));
    }
}
