import {ChildProcessByStdio} from "child_process";
import {Socket} from "socket.io";
import {Readable} from "stream";

export type IUdpPlayerData = {
    udp: string;
    ffmpeg: ChildProcessByStdio<null, Readable, null>;
    clients: Set<Socket>;
    initSeg: null | Buffer;
    bufferArray: any[];
};
