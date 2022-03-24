import { watch, FSWatcher } from 'chokidar';
import { readFileSync } from 'fs';
import { IModule } from '@socket/interfaces';
import { Namespace, Socket } from 'socket.io';

export class Watcher implements IModule {
    static watchers: FSWatcher[] = [];
    private watcher: FSWatcher;
    public name: string;
    private path: string;
    public mapFiles: Map<string, Buffer> = new Map();

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.watcher = watch(this.path);
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
            this.mapFiles.set(path, readFileSync(path));
            console.log(`File ${path} has been added`, this.mapFiles);
        });

        this.watcher.on('change', (path) => {
            this.add(path);
            console.log(`File ${path} has been changed`, this.mapFiles);
        });

        this.watcher.on('unlink', (path) => {
            this.mapFiles.delete(path);
            console.log(`File ${path} has been removed`, this.mapFiles);
        });

        this.watcher.on('ready', () => {
            this.mapFiles.clear();
            console.log(
                `Watcher: "${this.name}" ready to changes!!!`,
                this.mapFiles
            );
        });

        this.watcher.on('error', (error) =>
            console.log(`Watcher error: ${error}`)
        );
    }

    add(path: string) {
        if (this.mapFiles.has(path)) return;
        this.mapFiles.set(path, readFileSync(path));
    }
}
