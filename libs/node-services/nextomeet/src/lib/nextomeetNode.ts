import {
    IClientNextomeetReqEvent,
    IClientNextomeetResEvent,
    NodeService,
} from '@socket/shared-types';
import { EClientCmdEventType } from './types';
import { exec } from 'child_process';

export class NextomeetNodeService extends NodeService {
    init() {
        this.socket.on('connect', async () => {
            this.socket.emit('init', { nodeId: this.nodeId });
        });
        this.socket.on('request', this.handleRequest.bind(this));
        this.socket.on('error', (error) => console.log('Ooops: ', error));
    }

    private handleRequest(data: IClientNextomeetReqEvent) {
        const { cmd, params } = data;
        switch (cmd.toLocaleLowerCase()) {
            case EClientCmdEventType.restart_user:
                const { nextomeetId, userId, sdiPort } = params;
                exec(
                    `/usr/bin/php /home/dv2/cron.php helpers restart nextomeet ${nextomeetId} "${userId}" ${sdiPort}`,
                    (err, stdout, stderr) => {
                        if (err || stderr) {
                            this.socket.emit('response', {
                                nodeId: this.nodeId,
                                success: false,
                                error: err || stderr,
                            } as IClientNextomeetResEvent);
                        } else {
                            this.socket.emit('response', {
                                nodeId: this.nodeId,
                                success: true,
                                data: stdout,
                            } as IClientNextomeetResEvent);
                        }
                    }
                );
                break;
            default:
                this.socket.emit('response', {
                    nodeId: this.nodeId,
                    success: false,
                    error: `Unavailable command: ${cmd}`,
                } as IClientNextomeetResEvent);
        }
    }
}
