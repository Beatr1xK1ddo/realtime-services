import * as https from 'https';
import { IMainServiceModule } from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import { PinoLogger } from '@socket/shared-utils';
import { IThumbnailClientRequest } from './types';
import { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';

export class Thumbnails implements IMainServiceModule {
    public name: string;
    private server: https.Server;
    private io?: Namespace;
    private logger: PinoLogger;
    private clients: Map<string, Set<Socket>>;

    constructor(name: string, port: number, host: string) {
        this.name = name;
        this.logger = new PinoLogger();
        this.clients = new Map();
        this.server = https
            .createServer(
                {
                    key: readFileSync('/path/to/private.key'),
                    cert: readFileSync('/path/to/your_domain_name.crt'),
                },
                this.handleRequest.bind(this)
            )
            .listen(port, host, () => {
                this.logger.log.info(`HTTPS server runing on port ${port}...`);
            });
    }

    public init(io: Namespace) {
        try {
            this.io = io;
            this.io.on('connection', this.handleConnection.bind(this));
        } catch (e) {
            this.logger.log.error('Error while init', e);
        }
    }

    private handleConnection(socket: Socket) {
        socket.on('subscribe', (data: IThumbnailClientRequest) => {
            const { channel } = data;
            const channelClients = this.clients.get(channel);

            if (!channelClients) {
                this.clients.set(channel, new Set([socket]));
            }

            if (channelClients && !channelClients.has(socket)) {
                this.logger.log.info(`Client ${socket.id} subscbibed`);
                channelClients.add(socket);
            }
        });

        socket.on('unsubscribe', (data: IThumbnailClientRequest) => {
            const { channel } = data;
            const channelClients = this.clients.get(channel);

            if (!channelClients) {
                this.logger.log.info(`No channel was found`);
                return;
            }

            if (channelClients && channelClients.has(socket)) {
                this.logger.log.info(`Client ${socket.id} unsubscbibed`);
                channelClients.delete(socket);
            }
        });

        socket.on('error', (error) =>
            this.logger.log.error('Socket error: ', error)
        );
    }

    private handleRequest(req: IncomingMessage, res: ServerResponse) {
        const path = req.url?.split('?')[1];
        const params = new URLSearchParams(path);
        const payload: Buffer[] = [];

        req.on('data', (chunk) => {
            payload.push(chunk as Buffer);
        });

        req.on('end', () => {
            const image = Buffer.concat(payload);
            const channel = params.get('channel');

            if (path && channel) {
                this.broadcastThubnail(channel as string, image);
                res.writeHead(200);
                res.end();
            }
        });
    }

    private broadcastThubnail(path: string, imageBuffer: Buffer) {
        const clientsSet = this.clients.get(path);

        if (!clientsSet) {
            return;
        }
        this.logger.log.info('Sending data to clients...');
        clientsSet.forEach((socket) =>
            socket.emit('response', imageBuffer.toString('base64'))
        );
    }
}
