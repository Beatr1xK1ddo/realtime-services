"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Monitor = void 0;
const tslib_1 = require("tslib");
const mysql = require("mysql");
const conf = require("../config.json");
const _ = require("lodash");
const sql_queries_1 = require("./sql-queries");
const ioredis_1 = require("ioredis");
const utils_1 = require("@socket/utils");
class Monitor {
    constructor(name) {
        this.queries = sql_queries_1.default;
        this.name = name;
        this.redis = new ioredis_1.default(conf.redis);
        this.url = `${conf.server}?key=${conf.secret}&id=${this.name}&broadcast=true`;
    }
    init(io) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            try {
                this.io = io;
                this.io.on('connection', this.onConnection.bind(this));
                this.db = yield this.connectDb();
            }
            catch (e) {
                console.log('Ooops, :', e);
            }
        });
    }
    onConnection(socket) {
        this.startMonitor();
        socket.on('data', this.onData.bind(this));
        socket.on('error', (error) => {
            console.log('Ooops: ', error);
        });
    }
    connectDb() {
        return new Promise((resolve, reject) => {
            const $con = mysql.createPool({
                host: 'localhost',
                user: 'root',
                password: 'lolwhat1337',
                database: 'test',
                connectionLimit: 10,
            });
            $con.getConnection((err) => {
                if (err)
                    reject(err);
                resolve($con);
            });
        });
    }
    onData() {
        console.log(11);
    }
    startMonitor() {
        var _a;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const alerts = yield this.redis
                .smembers('monit-alerts')
                .catch((e) => console.log(e));
            if (_.isEmpty(alerts)) {
                (_a = this.io) === null || _a === void 0 ? void 0 : _a.send({
                    sender: this.name,
                    data: {
                        success: true,
                        data: null,
                    },
                });
            }
            else {
                _.each(this.parseMonitorAlerts(alerts), (monitorApps, appType) => {
                    if (!this.queries[appType])
                        return;
                    _.each(monitorApps, (monitorApp) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                        var _a, _b;
                        try {
                            const rows = yield ((_a = this.db) === null || _a === void 0 ? void 0 : _a.query(this.queries[appType]
                                .selectQuery, monitorApp));
                            if (rows && ((_b = rows === null || rows === void 0 ? void 0 : rows.values) === null || _b === void 0 ? void 0 : _b[0])) {
                                this.handleErrors(monitorApp, rows.values[0]);
                            }
                        }
                        catch (e) {
                            console.log('Oooops: ', e);
                        }
                    }));
                });
            }
            this.lastRuntime = utils_1.default.currentTime();
        });
    }
    handleErrors(app, sqlRec) {
        var _a, _b;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            try {
                let results = [];
                let history = null;
                results = yield Promise.all([
                    this.redis.get(`${app.cachePrefix}-last-comeback`),
                    this.redis.get(`${app.cachePrefix}-last-cc-comeback`),
                ]);
                const signalComebackTime = +results[0];
                const signalStabilizeTime = +results[1];
                if (sqlRec.haltUntil) {
                    const query = this.queries[app.appType].updateQuery;
                    (_a = this.db) === null || _a === void 0 ? void 0 : _a.query(query.replace('halt_comeback = false', 'halt_until = null'), { appId: app.appId });
                }
                if (signalComebackTime && signalStabilizeTime) {
                    if (sqlRec.haltComeback) {
                        (_b = this.db) === null || _b === void 0 ? void 0 : _b.query(this.queries[app.appType].updateQuery, {
                            appId: app.appId,
                        });
                    }
                    this.sendData('restore', null, null, sqlRec);
                }
                else if (sqlRec.haltComeback) {
                    this.sendData('restore', null, null, sqlRec);
                }
                else {
                    results = yield Promise.all([
                        this.redis.get(`${app.cachePrefix}-last-error`),
                        this.redis.get(`${app.cachePrefix}-last-cc-error`),
                    ]);
                    const signalLostTime = +results[0];
                    const signalErrorTime = +results[1];
                    if (signalLostTime) {
                        history = yield utils_1.default.getCache(app.uniqueID, () => this.fetchHistory(sqlRec));
                        this.sendData('status_error', signalLostTime, history, sqlRec, 0);
                    }
                    else if (signalErrorTime) {
                        results = yield Promise.all([
                            this.redis.get(`${app.cachePrefix}-last-cc-amount`),
                            this.redis.get(`${app.cachePrefix}-past-interval-cc-amount`),
                        ]);
                        history = yield utils_1.default.getCache(app.uniqueID, () => this.fetchHistory(sqlRec));
                        this.sendData('ts_errors', signalErrorTime, history, sqlRec, +results[0] + '/' + +results[1]);
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    parseMonitorAlerts(alerts) {
        const result = {};
        _.each(alerts, (item) => {
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
            if (!nodeIp || !nodePort)
                return;
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
    sendData(errorType, errorTime, errorHistory, sqlRec, replyCount) {
        var _a;
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
        (_a = this.io) === null || _a === void 0 ? void 0 : _a.send({
            sender: this.name,
            data: {
                success: true,
                data: data,
            },
        });
    }
    fetchHistory(sqlRec) {
        const { appId, appType, nodeId, nodeIp, nodePort } = sqlRec;
        const fromTime = utils_1.default.currentTime() - conf.live_monitor.history.depth;
        const toTime = utils_1.default.currentTime();
        return utils_1.default
            .exec(`php ${conf.live_monitor.history.bin} ${appType} ${appId} ${fromTime} ${toTime} ${nodeId} ${nodeIp} ${nodePort}`)
            .catch((e) => console.log('Ooops: ', e));
    }
}
exports.Monitor = Monitor;
//# sourceMappingURL=index.js.map