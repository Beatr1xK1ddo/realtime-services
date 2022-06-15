import {createServer as createHttpsServer, Server as HttpsServer} from "https";
import {createServer as createHttpServer, Server as HttpServer} from "http";
import {Socket} from "socket.io";
import * as url from "url";
import {readFileSync} from "fs";

import type {IncomingMessage, ServerResponse} from "http";
import type {SSL} from "@socket/shared-types";
import type {IThumbnailClientSubscription, IThumbnailResponse} from "./types";

import {MainServiceModule} from "@socket/shared/entities";

type ThumbnailsModuleOptions = {
    apiHttpServerPort: number;
    apiHttpsServerPort: number;
    apiServerSsl: SSL;
};

export class ThumbnailsModule extends MainServiceModule {
    private thumbnailsHttpsApiServer: HttpsServer;
    private thumbnailsHttpApiServer: HttpServer;
    private clients: Map<string, Set<Socket>>;

    constructor(name: string, options: ThumbnailsModuleOptions) {
        super(name);
        this.clients = new Map();
        this.thumbnailsHttpsApiServer = createHttpsServer(
            {
                key: readFileSync(options.apiServerSsl.key),
                cert: readFileSync(options.apiServerSsl.cert),
            },
            this.handleApiRequest.bind(this)
        ).listen(options.apiHttpsServerPort, () => {
            this.log(`HTTPS API server running on port ${options.apiHttpsServerPort}`);
        });
        this.thumbnailsHttpApiServer = createHttpServer(this.handleApiRequest.bind(this)).listen(
            options.apiHttpServerPort,
            () => {
                this.log(`HTTP API server running on port ${options.apiHttpServerPort}`);
            }
        );
        this.log("created");
    }

    protected override onConnected(socket: Socket) {
        super.onConnected(socket);
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
        socket.on("disconnect", this.handleDisconnect(socket).bind(this));
        socket.on("error", (error) => {
            this.log(`${socket.id} error: ${error.message}`, true);
        });
    }

    private handleDisconnect = (unsubscribed: Socket) => () => {
        const clientChannels = this.clients.keys();
        for (const key of clientChannels) {
            const sockets = this.clients.get(key);
            sockets?.delete(unsubscribed);
        }
        this.log(`client: ${unsubscribed.id} disconnected`);
    };

    private handleApiRequest(request: IncomingMessage, response: ServerResponse) {
        const requestURL = request.url;
        if (request.method === "POST" && requestURL && requestURL.startsWith("/thumb")) {
            const queryParams = url.parse(requestURL, true).query;
            const channel = queryParams["channel"];
            if (channel && typeof channel === "string" && this.clients.has(channel)) {
                // this.log(`got thumbnail for ${channel}`);
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
