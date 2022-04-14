import { Device, IPinoOptions } from '@socket/shared-types';

//todo: replace this with Device itself
export class TeranexDevice extends Device {

    constructor(ip: string, port: number, loggerOptions?: Partial<IPinoOptions>) {
        super(ip, port, {debounceDelay: 500, loggerOptions});
        this.connect();
    };

    public sendCommand(command: string): Promise<any> {
        return super.sendCommand(command);
    };
}
