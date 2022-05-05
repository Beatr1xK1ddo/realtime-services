import {
    AspectRatio,
    Audio,
    AudioStatus,
    Command,
    Format,
    Frame,
    Mode,
    Rate,
    Teranex,
    Video,
} from "./teranexControllerTypes";

type TeranexAction =
    | {type: "mode"; payload: Mode}
    | {type: "device"; payload: {panelLock: boolean; remLock: boolean}}
    | {type: "videoInput"; payload: {video: Video}}
    | {type: "audioInput"; payload: {audio: Audio}}
    | {type: "audioStatus"; payload: {audioStatus: AudioStatus}}
    | {type: "systemStatus"; payload: {tc: boolean; cc: boolean; vid: boolean}}
    | {type: "videoOutput"; payload: {format: Format; frame: Frame; rate: Rate}}
    | {type: "aspectRatio"; payload: {aspect: AspectRatio}}
    | {type: "ancillaryData"; payload: {tc: boolean; cc: boolean}}
    | {type: "genLock"; payload: {ref: boolean}};

export const teranexInitialState: Teranex = {
    panelLock: false,
    remLock: false,
    mode: null,
    video: null,
    audio: null,
    format: null,
    frame: null,
    rate: null,
    aspect: null,
    audioStatus: {
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
        8: false,
        9: false,
        10: false,
        11: false,
        12: false,
        13: false,
        14: false,
        15: false,
        16: false,
    },
    systemStatus: {vid: false, ref: false, ps: false, tc: false, cc: false, eth: false},
};

export function teranexReducer(state: Teranex, action: TeranexAction): Teranex {
    switch (action.type) {
        case "mode":
            return {
                ...state,
                mode: action.payload,
            };
        case "device":
            const newDeviceState = {
                ...state,
                panelLock: action.payload.panelLock,
                remLock: action.payload.remLock,
                systemStatus: {...state.systemStatus},
            };
            if (state.mode === null) {
                newDeviceState.mode = "in";
                newDeviceState.systemStatus.ps = true;
                newDeviceState.systemStatus.eth = true;
            }
            return newDeviceState;
        case "videoInput":
            return {
                ...state,
                video: action.payload.video,
            };
        case "audioInput":
            return {
                ...state,
                audio: action.payload.audio,
            };
        case "audioStatus":
            return {
                ...state,
                audioStatus: action.payload.audioStatus,
            };
        case "systemStatus":
            return {
                ...state,
                systemStatus: {
                    ...state.systemStatus,
                    tc: action.payload.tc,
                    cc: action.payload.cc,
                    vid: action.payload.vid,
                },
            };
        case "videoOutput":
            return {
                ...state,
                format: action.payload.format,
                frame: action.payload.frame,
                rate: action.payload.rate,
            };
        case "aspectRatio":
            return {
                ...state,
                aspect: action.payload.aspect,
            };
        case "ancillaryData":
            if (
                (!state.systemStatus.tc && action.payload.tc) ||
                (!state.systemStatus.cc && action.payload.cc)
            ) {
                return {
                    ...state,
                    systemStatus: {
                        ...state.systemStatus,
                        tc: action.payload.tc,
                        cc: action.payload.cc,
                    },
                };
            } else {
                return state;
            }
        case "genLock":
            return {
                ...state,
                systemStatus: {
                    ...state.systemStatus,
                    ref: action.payload.ref,
                },
            };
        default:
            return state;
    }
}

type CommandAction =
    | {type: "device"; payload: {panelLock: boolean; remLock: boolean}}
    | {type: "video"; payload: Video}
    | {type: "audio"; payload: Audio}
    | {type: "format"; payload: Format}
    | {type: "frame"; payload: Frame}
    | {type: "rate"; payload: Rate}
    | {type: "aspect"; payload: AspectRatio};

export const commandInitialState: Command = {
    mode: null,
    panelLock: false,
    remLock: false,
    video: null,
    audio: null,
    format: null,
    frame: null,
    rate: null,
    aspect: null,
};

export function commandReducer(state: Command, action: CommandAction): Command {
    switch (action.type) {
        case "device":
            return {
                ...state,
                panelLock: action.payload.panelLock,
                remLock: action.payload.remLock,
            };
        case "video":
        case "audio":
        case "format":
        case "frame":
        case "rate":
        case "aspect":
            return {
                ...state,
                [action.type]: action.payload,
            };
        default:
            return state;
    }
}
