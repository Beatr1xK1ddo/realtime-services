import {Namespace} from 'socket.io';

export interface IMainServiceModule {
    name: string;
    init(io: Namespace): void;
}
