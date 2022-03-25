import { watch, FSWatcher } from 'chokidar';
import { readFileSync } from 'fs';
import { IModule } from '@socket/interfaces';
import { Namespace, Socket } from 'socket.io';
import * as path from 'path';

export class Watcher implements IModule {
    static watchers: FSWatcher[] = [];
    private watcher: FSWatcher;
    public name: string;
    private path: string;
    public map: Map<string, Buffer> = new Map();

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.watcher = watch(this.path, {
            ignoreInitial: true,
        });
        Watcher.watchers.push(this.watcher);
    }

    init(io: Namespace) {
        io.on('connection', this.onConnection);
    }

    onConnection(socket: Socket) {
        console.log(`WatcherSocket: ${socket.id} connected...`);

        socket.on('message', (message: string) => {
            console.log('Logger message: ', message);
        });

        socket.on('error', (error) => console.log(error));
    }

    setPath(path: string) {
        this.path = path;
        this.watcher = watch(this.path);
    }

    run() {
        this.watcher.on('add', (path) => {
            this.map.set(path, readFileSync(path));
            console.log(`File ${path} has been added`, this.map);
        });

        this.watcher.on('change', (path) => {
            this.add(path);
            console.log(`File ${path} has been changed`, this.map);
        });

        this.watcher.on('unlink', (path) => {
            this.map.delete(path);
            console.log(`File ${path} has been removed`, this.map);
        });

        this.watcher.on('ready', () => {
            console.log(
                `Watcher: "${this.name}" ready to changes!!!`,
                this.map
            );
        });

        this.watcher.on('error', (error) =>
            console.log(`Watcher error: ${error}`)
        );
    }

    add(path: string) {
        if (this.map.has(path)) return;
        this.map.set(path, readFileSync(path));
    }

    parseNodeId(filepath) {
        return +path.parse(filepath).name.replace('node_', '');
    }
}
