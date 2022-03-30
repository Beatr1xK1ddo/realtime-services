"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppInstall = void 0;
const tslib_1 = require("tslib");
const chokidar_1 = require("chokidar");
const fs_1 = require("fs");
const path = require("path");
const Diff = require("diff");
// import * as config from '../config.json';
class AppInstall {
    // private folder: string;
    constructor(name, path) {
        this.files = new Map();
        this.name = name;
        this.path = path;
        this.watcher = (0, chokidar_1.watch)(this.path, {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 200,
                pollInterval: 100,
            },
        });
        // тут я оставил в комментариях его способ установления пути отслеживания файлов
        // щас реализована моя через конструктор
        // this.folder = config.app_install.logsDir;
    }
    init(io) {
        this.io = io;
        this.io.on('connection', this.onConnection);
    }
    onConnection(socket) {
        console.log(`WatcherSocket: ${socket.id} connected...`);
        this.run();
        socket.on('error', (error) => console.log(error));
    }
    run() {
        this.watcher.on('add', (path) => {
            const nodeId = this.parseNodeId(path);
            if (nodeId) {
                this.files.set(path, {
                    node: nodeId,
                    content: (0, fs_1.readFileSync)(path, 'utf8'),
                });
            }
            console.log(`File ${path} has been added`, this.files);
        });
        this.watcher.on('change', (path) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.files.has(path)) {
                const diffContent = yield this.getDiffContent(path);
                if (diffContent) {
                    const { node } = this.files.get(path);
                    this.sendData(node, diffContent);
                }
            }
            console.log(`File ${path} has been changed`, this.files);
        }));
        this.watcher.on('unlink', (path) => {
            this.files.delete(path);
            console.log(`File ${path} has been removed`, this.files);
        });
        this.watcher.on('ready', () => {
            console.log(`Watcher: "${this.name}" ready to changes!!!`, this.files);
        });
        this.watcher.on('error', (error) => console.log(`Watcher error: ${error}`));
    }
    parseNodeId(filepath) {
        return +path.parse(filepath).name.replace('node_', '');
    }
    getDiffContent(filepath) {
        return new Promise((resolve) => {
            const { node, content: oldContent } = this.files.get(filepath);
            const newContent = (0, fs_1.readFileSync)(filepath, 'utf8');
            const [oldC, newC] = Diff.diffChars(oldContent, newContent);
            this.files.set(filepath, {
                node: node,
                content: newContent,
            });
            let diffValue = '';
            if (newC) {
                if (newC.added) {
                    diffValue = newC.value;
                }
            }
            else {
                if (oldC && oldC.added) {
                    diffValue = oldC.value;
                }
            }
            if (diffValue[diffValue.length - 1] === '\n') {
                diffValue = diffValue.slice(0, -1);
            }
            resolve(diffValue);
        });
    }
    sendData(node, data) {
        this.io.send({
            sender: this.name,
            data: {
                node: node,
                content: data,
            },
        });
    }
}
exports.AppInstall = AppInstall;
//# sourceMappingURL=index.js.map