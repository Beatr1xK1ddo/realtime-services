"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const tslib_1 = require("tslib");
const mongoose_1 = require("mongoose");
const interfaces_1 = require("@socket/interfaces");
class Logger {
    constructor(name) {
        this.dbURL = 'mongodb+srv://testing:qwerty!123456@cluster0.1qqgw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
        this.clients = new Map();
        this.db = new mongoose_1.Mongoose();
        this.name = name;
    }
    init(io) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            try {
                this.io = io;
                yield this.dbConnection();
                this.io.on('connection', this.onConnection.bind(this));
            }
            catch (e) {
                console.log('Ooops, :', e);
            }
        });
    }
    onConnection(socket) {
        socket.on('unsubscribe', (room) => {
            var _a;
            (_a = this.clients.get(room)) === null || _a === void 0 ? void 0 : _a.delete(socket);
        });
        socket.on('data', this.logHandler.bind(this));
        socket.on('error', (error) => console.log('Ooops', error));
        socket.on('subscribe', (room) => {
            const roomSet = this.clients.get(room);
            if (roomSet === null || roomSet === void 0 ? void 0 : roomSet.has(socket)) {
                return;
            }
            roomSet === null || roomSet === void 0 ? void 0 : roomSet.add(socket);
            // if (roomSet) {
            //     roomSet.add(socket);
            // }
            // this.clients.set(room, new Set([socket]));
        });
    }
    dbConnection() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.db.connection.readyState) {
                return;
            }
            try {
                this.db.connection.once('open', this.createCollections);
                yield this.db.connect(this.dbURL);
            }
            catch (error) {
                this.db.connection.close();
                console.log('Ooops: ', error);
            }
        });
    }
    createCollections() {
        for (const name in interfaces_1.ELogTypes) {
            this.db.connection.collection(name);
            this.clients.set(name, new Set());
        }
    }
    logHandler(data) {
        var _a;
        const { type } = data;
        (_a = this.clients
            .get(type)) === null || _a === void 0 ? void 0 : _a.forEach((socket) => socket.emit('message', data));
        this.collections[type].insertOne(data);
    }
    get collections() {
        return this.db.connection.collections;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=index.js.map