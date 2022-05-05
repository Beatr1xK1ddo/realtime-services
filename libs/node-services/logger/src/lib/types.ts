import {ChildProcessWithoutNullStreams} from "child_process";

export type IFile = {
    lastChunk: null;
    tail: ChildProcessWithoutNullStreams;
};
