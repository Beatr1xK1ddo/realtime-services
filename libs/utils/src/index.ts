import { readFileSync, existsSync, writeFileSync, appendFile } from 'fs';
import * as _ from 'lodash';
import * as shell from 'child_process';
import * as conf from 'config';

export default {
    currentTime() {
        return Math.round(new Date().getTime() / 1000);
    },
    exec(cmd: string) {
        return new Promise((resolve, reject) => {
            shell.exec(cmd, (err: any, output: any) => {
                err ? reject(err) : resolve(output);
            });
        });
    },
    async getCache(key: string, saveCallback: any) {
        let dataContent: any = null;

        try {
            const cacheFile = `${conf.logDir}${key}`;

            let isExpired = false;

            if (existsSync(cacheFile)) {
                const { expires, data } = JSON.parse(
                    readFileSync(cacheFile, 'utf8')
                );

                if (+expires < this.currentTime()) {
                    isExpired = true;
                } else {
                    dataContent = data;
                }
            } else {
                isExpired = true;
            }

            if (isExpired) {
                dataContent = await saveCallback();

                setTimeout(() => {
                    writeFileSync(
                        cacheFile,
                        JSON.stringify({
                            expires: this.currentTime() + 1800,
                            data: dataContent || null,
                        })
                    );
                });
            }
        } catch (e) {
            dataContent = null;
        }

        return Promise.resolve(dataContent || null);
    },
    log(message: string) {
        try {
            appendFile(
                conf.logDir + 'common_log.txt',
                new Date().toUTCString() + '  ' + message + '\n',
                (err) => {
                    err && console.log(err.toString());
                }
            );
        } catch (e) {}
    },
    getPort(url: string) {
        return _.trim(url.split(':').slice(-1).pop(), '/');
    },
};
