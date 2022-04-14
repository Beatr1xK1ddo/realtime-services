import {Format, Frame, Rate} from "./teranexControllerTypes";

const VIDEO_MODES = {
    '525i59.94 NTSC': {format: '525', frame: 'i', rate: '59.94'},
    '625i50 PAL': {format: '625', frame: 'i', rate: '50'},
    '720p50': {format: '720', frame: 'p', rate: '50'},
    '720p59.94': {format: '720', frame: 'p', rate: '59.94'},
    '720p60': {format: '720', frame: 'p', rate: '60'},
    '1080p23.98': {format: '1080', frame: 'p', rate: '23.98'},
    '1080PsF23.98': {format: '1080', frame: 'psf', rate: '23.98'},
    '1080p24': {format: '1080', frame: 'p', rate: '24'},
    '1080PsF24': {format: '1080', frame: 'psf', rate: '24'},
    '1080p25': {format: '1080', frame: 'p', rate: '25'},
    '1080PsF25': {format: '1080', frame: 'psf', rate: '25'},
    '1080p29.97': {format: '1080', frame: 'p', rate: '29.97'},
    '1080PsF29.97': {format: '1080', frame: 'psf', rate: '29.97'},
    '1080p30': {format: '1080', frame: 'p', rate: '30'},
    '1080PsF30': {format: '1080', frame: 'psf', rate: '30'},
    '1080i50': {format: '1080', frame: 'i', rate: '50'},
    '1080p50': {format: '1080', frame: 'p', rate: '50'},
    '1080i59.94': {format: '1080', frame: 'i', rate: '59.94'},
    '1080p59.94': {format: '1080', frame: 'p', rate: '59.94'},
    '1080i60': {format: '1080', frame: 'i', rate: '60'},
    '1080p60': {format: '1080', frame: 'p', rate: '60'},
    '2K DCI 23.98p': {format: '2k', frame: 'p', rate: '23.98'},
    '2K DCI 23.98PsF': {format: '2k', frame: 'psf', rate: '23.98'},
    '2K DCI 24p': {format: '2k', frame: 'p', rate: '24'},
    '2K DCI 24PsF': {format: '2k', frame: 'psf', rate: '24'},
    '2160p23.98': {format: 'ultraHd', frame: 'p', rate: '23.98'},
    '2160p24': {format: 'ultraHd', frame: 'p', rate: '24'},
    '2160p25': {format: 'ultraHd', frame: 'p', rate: '25'},
    '2160p29.97': {format: 'ultraHd', frame: 'p', rate: '29.97'},
    '2160p30': {format: 'ultraHd', frame: 'p', rate: '30'},
    '2160p50': {format: 'ultraHd', frame: 'p', rate: '50'},
    '2160p59.94': {format: 'ultraHd', frame: 'p', rate: '59.94'},
    '2160p60': {format: 'ultraHd', frame: 'p', rate: '60'},
};

export function destructVideoMode(videoMode: string): { format: Format, frame: Frame, rate: Rate } {
    let format: Format = null
    let frame: Frame = null
    let rate: Rate = null
    // @ts-ignore
    const videoModeData = VIDEO_MODES[videoMode];
    if (videoModeData) {
        format = videoModeData.format;
        frame = videoModeData.frame;
        rate = videoModeData.rate;
    }
    return {format, frame, rate};
}
