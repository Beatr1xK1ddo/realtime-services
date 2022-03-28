export * from './lib/modules-udp-player';
import { IMainServiceModule } from '@socket/shared-types';
import { Namespace, Socket } from 'socket.io';
import { IUdpPlayer } from './types';

export class UdpPlayer implements IMainServiceModule {
    public name: string;
    private io?: Namespace;
    private streams: Map<string, IUdpPlayer>;

    constructor(name: string) {
        this.name = name;
    }

    init(io: Namespace) {
        this.io = io;
        this.io.on('connection', this.onConnection.bind(this));
    }

    private onConnection(socket: Socket) {
        socket.on('error', (error) => console.log('Ooops: ', error));
    }
    // const { query: { udp } } = url.parse(req.url, true);

    // if (!streams.has(udp)) {
    //     const ffmpeg = child(
    //         'ffmpeg',
    //         `-i udp://@${udp}?fifo_size=1000000&overrun_nonfatal=1 -f mp4 -c:v copy -c:a aac -ac 2 -b:a 128k -ar 44100 -threads 0 -movflags frag_keyframe+empty_moov+default_base_moof -frag_duration 1000000 -min_frag_duration 1000000 pipe:1`.split(' '),
    //         { stdio: ['ignore', 'pipe', 'inherit'] }
    //     );

    //     const newStream = {
    //         udp,
    //         ffmpeg,
    //         clients: new Set,
    //         initSeg: null,
    //         bufferArray: []
    //     };

    //     ffmpeg.stdout.on('data', partData => {
    //         newStream.bufferArray.push(partData);

    //         if (partData.length >= MAX_BUFFER_SIZE) return;

    //         const fmp4Data = Buffer.concat(newStream.bufferArray);
    //         newStream.bufferArray = [];

    //         newStream.clients.forEach(client => {
    //             if (client.readyState === WebSocket.OPEN) {
    //                 if (newStream.initSeg && !client.isInitSent) {
    //                     client.send(newStream.initSeg);
    //                 }

    //                 client.send(fmp4Data);
    //                 client.isInitSent = true;
    //             }
    //         });

    //         if (!newStream.initSeg) newStream.initSeg = fmp4Data;
    //     });

    //     ffmpeg.on('close', (code, signal) => {
    //         streams.delete(udp);
    //     });

    //     streams.set(udp, newStream);
    // }

    // const stream = streams.get(udp);
    // stream.clients.add(client);

    // client.on('close', (code, message) => {
    //     stream.clients.delete(client);

    //     if (!stream.clients.size) {
    //         stream.ffmpeg.kill('SIGINT');
    //     }
    // });
}
