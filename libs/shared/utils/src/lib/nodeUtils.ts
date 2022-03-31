import * as shell from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
//todo: utils should not rely on any configs/ all utils functions should rely on args instead
import * as conf from './config.json';

function exec(cmd: string): Promise<any> {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, (err: any, output: any) => {
            err ? reject(err) : resolve(output);
        });
    });
}
async function getNodeId(): Promise<number> {
    let nodeId = null;
    try {
        const id = await exec('/usr/bin/php/root/dv_control_new.php hostname');
        nodeId = Number.parseInt(id);
    } catch (e) {
        console.warn('NXT|WARNING: Cannot get node id');
    }
    return nodeId;
}

function currentTime() {
    return Math.round(new Date().getTime() / 1000);
}

async function getCache(key, saveCallback) {
    let dataContent = null;

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
}

export { exec, getNodeId, currentTime, getCache };
