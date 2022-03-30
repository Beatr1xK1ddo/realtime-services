/// <reference types="node" />
import { ChildProcessWithoutNullStreams } from 'child_process';
export declare type IFile = {
    counter: number;
    lastChunk: null;
    tail: ChildProcessWithoutNullStreams;
};
