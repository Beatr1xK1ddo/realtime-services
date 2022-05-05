import {createServer, Server} from "https";
import * as url from "url";
import {readFileSync} from "fs";
import {Namespace, Socket} from "socket.io";

import type {IncomingMessage, ServerResponse} from "http";
import type {SSL} from "@socket/shared-types";
import type {IThumbnailClientSubscription, IThumbnailResponse} from "./types";

import {MainServiceModule} from "@socket/shared/entities";

type ThumbnailsModuleOptions = {
    apiServerPort: number;
    apiServerSsl: SSL;
};

export class ThumbnailsModule extends MainServiceModule {
    private thumbnailsApiServer: Server;
    private clients: Map<string, Set<Socket>>;

    constructor(name: string, options: ThumbnailsModuleOptions) {
        super(name);
        this.clients = new Map();
        this.thumbnailsApiServer = createServer(
            {
                key: readFileSync(options.apiServerSsl.key),
                cert: readFileSync(options.apiServerSsl.cert),
            },
            this.handleApiRequest.bind(this)
        ).listen(options.apiServerPort, () => {
            this.log(`API server running on port ${options.apiServerPort}`);
        });
        this.log("created");
    }

    override init(io: Namespace) {
        super.init(io);
        this.registerHandler("connection", this.handleClientConnection.bind(this));
        this.log("initialized");
    }

    private handleClientConnection(socket: Socket) {
        socket.on("subscribe", (data: IThumbnailClientSubscription) => {
            const {channel} = data;
            this.log(`subscribe request from ${socket.id} for ${channel}`);
            if (!this.clients.has(channel)) {
                this.clients.set(channel, new Set());
            }
            this.clients.get(channel)!.add(socket);
            this.log(`subscribe request from ${socket.id} for ${channel} succeed`);
        });
        socket.on("unsubscribe", (data: IThumbnailClientSubscription) => {
            const {channel} = data;
            this.log(`unsubscribe request from ${socket.id} for ${channel}`);
            const channelClients = this.clients.get(channel);
            if (channelClients) {
                channelClients.delete(socket);
                this.log(`unsubscribe request from ${socket.id} for ${channel} succeed`);
            } else {
                this.log(`Unsubscribe request from ${socket.id} for ${channel}`);
            }
        });
        socket.on("error", (error) => {
            this.log(`${socket.id} error: ${error.message}`, true);
        });
    }

    private handleApiRequest(request: IncomingMessage, response: ServerResponse) {
        const requestURL = request.url;
        if (request.method === "POST" && requestURL && requestURL.startsWith("/thumb")) {
            const queryParams = url.parse(requestURL, true).query;
            const channel = queryParams["channel"];
            if (channel && typeof channel === "string" && this.clients.has(channel)) {
                this.log(`got thumbnail for ${channel}`);
                const payload: Buffer[] = [];
                request.on("data", (chunk) => {
                    payload.push(chunk as Buffer);
                });
                request.on("end", () => {
                    const image = Buffer.concat(payload);
                    this.sendThumbnail(channel, image);
                    response.writeHead(200);
                    response.end();
                });
            } else {
                response.writeHead(200);
                response.end();
            }
        } else {
            response.writeHead(400);
            response.end();
        }
    }

    private sendThumbnail(channel: string, imageBuffer: Buffer) {
        this.clients.get(channel)?.forEach((socket) => {
            const response: IThumbnailResponse = {
                channel,
                imageSrcBase64: `data:image/png;base64,${imageBuffer.toString("base64")}`,
            };
            socket.emit("thumbnail", response);
        });
    }
}
