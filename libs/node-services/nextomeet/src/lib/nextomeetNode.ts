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
            this.logger.log.info('NextomeetNodeService connected');
            this.socket.emit('init', { nodeId: this.nodeId });
        });
        this.socket.on('request', this.handleRequest.bind(this));
        this.socket.on('error', (error) =>
            this.logger.log.error('NextomeetNodeService error: ', error)
        );
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
                            this.logger.log.error(err || stderr);
                            this.socket.emit('response', {
                                nodeId: this.nodeId,
                                success: false,
                                error: err || stderr,
                            } as IClientNextomeetResEvent);
                        } else {
                            this.logger.log.info(
                                'command complete successfuly success'
                            );
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
                this.logger.log.error(`Unavailable command: ${cmd}`);
                this.socket.emit('response', {
                    nodeId: this.nodeId,
                    success: false,
                    error: `Unavailable command: ${cmd}`,
                } as IClientNextomeetResEvent);
        }
    }
}
