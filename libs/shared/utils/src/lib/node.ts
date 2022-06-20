import * as shell from "child_process";
import {existsSync, readFileSync, writeFileSync} from "fs";

import {nowInSeconds} from "./common";

export function exec(cmd: string): Promise<any> {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, (err: any, output: any) => {
            err ? reject(err) : resolve(output);
        });
    });
}

export async function getNodeId(): Promise<number> {
    let nodeId = null;
    try {
        const id = await exec("sudo /usr/bin/php /root/dv_control_new.php hostname");
        nodeId = Number.parseInt(id);
    } catch (e) {
        console.warn("NXT|WARNING: Cannot get node id");
    }
    return nodeId;
}

export async function getCache(file, saveCallback) {
    let dataContent = null;

    try {
        let isExpired = false;

        if (existsSync(file)) {
            const {expires, data} = JSON.parse(readFileSync(file, "utf8"));

            if (+expires < nowInSeconds()) {
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
                    file,
                    JSON.stringify({
                        expires: nowInSeconds() + 1800,
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
