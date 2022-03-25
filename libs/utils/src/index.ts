import * as shell from 'child_process';

function exec(cmd: string): Promise<any> {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, (err: any, output: any) => {
            err ? reject(err) : resolve(output);
        });
    });
}

async function getNodeId(): Promise<number | null> {
    try {
        const id = await exec("/usr/bin/php /root/dv_control_new.php hostname");
        return Number.parseInt(id);
    } catch (e) {
        return null;
    }
}

export {exec, getNodeId};
