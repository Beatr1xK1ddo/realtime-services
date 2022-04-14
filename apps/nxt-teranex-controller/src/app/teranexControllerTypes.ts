export type PanelLock = boolean;
export type RemLock = boolean;
export type Mode = 'in' | 'out' | null;
export type Video = 'sdi' | 'hdmi' | 'opt' | null;
export type Audio = 'embed' | 'aes' | 'anlg' | null;
export type Format = '486' | '576' | '720' | '1080' | '2k' | 'ultraHd' | null;
export type Frame = 'p' | 'i' | 'psf' | null;
export type Rate = | '23.98' | '24' | '25' | '29.97' | '30' | '50' | '59.94' | '60' | null;
export type AspectRatio = | 'anam' | '14:9' | 'lbox-pbox' | 'ccut-zoom' | 'smart' | 'adj' | null;
export type AudioStatus = {
    1: boolean, 2: boolean, 3: boolean, 4: boolean, 5: boolean, 6: boolean, 7: boolean, 8: boolean,
    9: boolean, 10: boolean, 11: boolean, 12: boolean, 13: boolean, 14: boolean, 15: boolean, 16: boolean,
};
export type VideoStatus = {
    vid: boolean;
    ref: boolean;
    ps: boolean;
    tc: boolean;
    cc: boolean;
    eth: boolean;
};
export type Teranex = {
    panelLock: PanelLock;
    remLock: RemLock;
    mode: Mode;
    video: Video;
    audio: Audio;
    format: Format;
    frame: Frame;
    rate: Rate;
    aspect: AspectRatio;
    audioStatus: AudioStatus;
    systemStatus: VideoStatus;
};
export type Command = {
    panelLock: PanelLock;
    remLock: RemLock;
    mode: Mode;
    video: Video;
    audio: Audio;
    format: Format;
    frame: Frame;
    rate: Rate;
    aspect: AspectRatio;
};
