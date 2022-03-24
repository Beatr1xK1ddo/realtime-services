const Net = require('net');

module.exports = class TeranexDevice {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.timeout = 2000;
        this.socket = null;

        this.resp = {};
        this.busy = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.resp = {
                resolve,
                reject,
            };

            this.socket && this.socket.end();
            this.socket = new Net.Socket();

            this.socket.setEncoding('utf8');
            this.socket.setTimeout(this.timeout);

            this.socket.connect({ host: this.ip, port: this.port }, () =>
                this.resp.resolve()
            );

            this.socket.on(
                'data',
                (data) => (this.resp.data += data.toString())
            );

            this.socket.on('error', (err) => this.resp.reject(err));

            this.socket.on('timeout', () => this.resp.reject(Error('timeout')));
        });
    }

    command(cmd, timeout = 0.7) {
        return new Promise((resolve, reject) => {
            this.resp = {
                resolve,
                reject,
                data: '',
            };

            this.socket.write(cmd);
            setTimeout(() => resolve(this.resp.data), timeout * 1000);
        });
    }

    destroy() {
        this.socket && this.socket.end();
    }
};
