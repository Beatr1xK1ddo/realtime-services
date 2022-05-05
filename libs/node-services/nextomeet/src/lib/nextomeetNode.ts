import {IClientNextomeetReqEvent, IClientNextomeetResEvent} from "@socket/shared-types";
import {EClientCmdEventType} from "./types";
import {exec} from "child_process";
import {NodeService} from "@socket/shared/entities";

export class NextomeetNodeService extends NodeService {
    protected override onConnected() {
        super.onConnected();
        this.registerHandler("request", this.handleRequest);
        this.emit("init", {nodeId: this.nodeId});
    }

    private handleRequest(data: IClientNextomeetReqEvent) {
        const {cmd, params} = data;
        switch (cmd.toLocaleLowerCase()) {
            case EClientCmdEventType.restart_user:
                const {nextomeetId, userId, sdiPort} = params;
                exec(
                    `/usr/bin/php /home/dv2/cron.php helpers restart nextomeet ${nextomeetId} "${userId}" ${sdiPort}`,
                    (err, stdout, stderr) => {
                        if (err || stderr) {
                            this.log(stderr, true);
                            this.emit("response", {
                                nodeId: this.nodeId,
                                success: false,
                                error: err || stderr,
                            } as IClientNextomeetResEvent);
                        } else {
                            this.log("command complete successfuly success");
                            this.emit("response", {
                                nodeId: this.nodeId,
                                success: true,
                                data: stdout,
                            } as IClientNextomeetResEvent);
                        }
                    }
                );
                break;
            default:
                this.log(`Unavailable command: ${cmd}`, true);
                this.emit("response", {
                    nodeId: this.nodeId,
                    success: false,
                    error: `Unavailable command: ${cmd}`,
                } as IClientNextomeetResEvent);
        }
    }
}
