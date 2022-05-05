import {IMainServiceModule, IPinoOptions} from "@socket/shared-types";
import {Namespace, Socket} from "socket.io";
import {IUdpPlayerData} from "./types";
import {parse} from "url";
import {spawn} from "child_process";
import {PinoLogger} from "@socket/shared-utils";

const MAX_BUFFER_SIZE = 65536;

export class UdpPlayer implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private streams: Map<string, IUdpPlayerData>;
    private logger: PinoLogger;

    constructor(name: string, loggerOptions?: Partial<IPinoOptions>) {
        this.name = name;
        this.logger = new PinoLogger(
            loggerOptions?.name,
            loggerOptions?.level,
            loggerOptions?.path
        );
    }

    init(io: Namespace) {
        this.io = io;
        this.io.on("connection", this.onConnection.bind(this));
    }

    private onConnection(socket: Socket) {
        const url = socket.request.url;
        const {query} = parse(url, true);

        if (!("udp" in query)) {
            return;
        }

        if (!this.streams.has(query.udp as string)) {
            const ffmpeg = spawn(
                "ffmpeg",
                `-i udp://@${query.udp}?fifo_size=1000000&overrun_nonfatal=1 -f mp4 -c:v copy -c:a aac -ac 2 -b:a 128k -ar 44100 -threads 0 -movflags frag_keyframe+empty_moov+default_base_moof -frag_duration 1000000 -min_frag_duration 1000000 pipe:1`.split(
                    " "
                ),
                {stdio: ["ignore", "pipe", "inherit"]}
            );

            ffmpeg.stdout.on("data", (data) => {
                this.logger.log.info("ffmpeg data: ", data);
                const newStream: IUdpPlayerData = {
                    udp: query.udp as string,
                    ffmpeg,
                    clients: new Set(),
                    initSeg: null,
                    bufferArray: [],
                };

                newStream.bufferArray.push(data);

                if (data.length >= MAX_BUFFER_SIZE) return;

                const fmp4Data = Buffer.concat(newStream.bufferArray);

                newStream.bufferArray = [];

                newStream.clients.forEach((socket) => {
                    // if (newStream.initSeg && !client.isInitSent) { у него было так,
                    if (newStream.initSeg) {
                        socket.send(newStream.initSeg);
                    }

                    socket.send(fmp4Data);
                    // socket.isInitSent = true; и вот так
                });

                if (!newStream.initSeg) newStream.initSeg = fmp4Data;

                ffmpeg.on("close", (code, signal) => {
                    this.logger.log.info("ffmpeg closing udp: ", query.udp);
                    this.streams.delete(query.udp as string);
                });

                this.streams.set(query.udp as string, newStream);
            });
        }
        const stream = this.streams.get(query.udp as string);

        stream.clients.add(socket);

        socket.on("disconnect", () => {
            this.logger.log.info(`Socket ${socket.id} disconnected`);
            stream.clients.delete(socket);

            if (!stream.clients.size) {
                stream.ffmpeg.kill("SIGINT");
            }
        });

        socket.on("error", (error) => this.logger.log.error("Socket error", error));
    }
}
