import { ChildProcessWithoutNullStreams } from 'child_process';

export type IFile = {
    counter: number;
    lastChunk: null;
    tail: ChildProcessWithoutNullStreams;
};
