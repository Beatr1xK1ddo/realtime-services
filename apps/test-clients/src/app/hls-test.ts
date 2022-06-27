import {io, Manager} from "socket.io-client";

export function hlsTestRun(url: string) {
    console.log(`Initializing client connection to LoggerModule on ${url}`);
    const socket = io(`${url}/hls`);

    socket.on("connect", () => {
        console.log("Client connected to HlsModule");
        socket.emit("clientSubscribe", "testing-logs.txt");
    });

    socket.on("response", (data) => {
        console.log(`HLS data ${JSON.stringify(data)}`);
    });
    socket.on("error", (error) => {
        console.log(`Logger error ${JSON.stringify(error)}`);
    });
}
