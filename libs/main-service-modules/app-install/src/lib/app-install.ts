import { watch, FSWatcher } from 'chokidar';
import { readFileSync } from 'fs';
import { IMainServiceModule } from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import * as path from 'path';
import { IAppInstallFiles } from './types';
import * as Diff from 'diff';

// import * as config from '../config.json';

export class AppInstall implements IMainServiceModule {
    private watcher: FSWatcher;
    public name: string;
    private path: string;
    private io?: Namespace;
    public files: Map<string, IAppInstallFiles> = new Map();
    // private folder: string;

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.watcher = watch(this.path, {
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

    init(io: Namespace) {
        this.io = io;
        this.io.on('connection', this.onConnection);
    }

    private onConnection(socket: Socket) {
        console.log(`WatcherSocket: ${socket.id} connected...`);

        this.run();

        socket.on('error', (error) => console.log(error));
    }

    private run() {
        this.watcher.on('add', (path) => {
            const nodeId = this.parseNodeId(path);
            if (nodeId) {
                this.files.set(path, {
                    node: nodeId,
                    content: readFileSync(path, 'utf8'),
                });
            }
            console.log(`File ${path} has been added`, this.files);
        });

        this.watcher.on('change', async (path) => {
            if (this.files.has(path)) {
                const diffContent = await this.getDiffContent(path);

                if (diffContent) {
                    const { node } = this.files.get(path);
                    this.sendData(node, diffContent);
                }
            }
            console.log(`File ${path} has been changed`, this.files);
        });

        this.watcher.on('unlink', (path) => {
            this.files.delete(path);
            console.log(`File ${path} has been removed`, this.files);
        });

        this.watcher.on('ready', () => {
            console.log(
                `Watcher: "${this.name}" ready to changes!!!`,
                this.files
            );
        });

        this.watcher.on('error', (error) =>
            console.log(`Watcher error: ${error}`)
        );
    }

    parseNodeId(filepath: string) {
        return +path.parse(filepath).name.replace('node_', '');
    }

    getDiffContent(filepath: string) {
        return new Promise((resolve) => {
            const { node, content: oldContent } = this.files.get(filepath);
            const newContent = readFileSync(filepath, 'utf8');

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
            } else {
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
