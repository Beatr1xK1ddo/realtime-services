// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
    SyntheticEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useReducer,
    useRef,
    useState,
} from "react";
import {io, Socket} from "socket.io-client";
import clsx from "clsx";

import "./teranexController.css";
import {
    commandInitialState,
    commandReducer,
    teranexInitialState,
    teranexReducer,
} from "./teranexControllerState";
import {TERANEX_COMMANDS_SET, TERANEX_RESPONSE, TERANEX_UPDATE} from "./blackMagicProtocol";
import {
    AspectRatio,
    Audio,
    AudioStatus,
    Format,
    Frame,
    Rate,
    Video,
} from "./teranexControllerTypes";
import {destructVideoMode} from "./teranexControllerUtils";

const url = "wss://qa.nextologies.com:1987";
const nodeId = 356;
const ip = "192.168.99.22";
const port = 9800;

export function TeranexController() {
    const socket = useRef<null | Socket>(null);
    const messagesRef = useRef<null | HTMLDivElement>(null);
    const [screenMessages, setScreenMessages] = useState<Array<string>>([]);
    const [initDone, setInitDone] = useState(false);
    const [processingCommand, setProcessingCommand] = useState<null | string>(null);
    const [teranex, teranexDispatch] = useReducer(teranexReducer, teranexInitialState);
    const [command, commandDispatch] = useReducer(commandReducer, commandInitialState);

    useLayoutEffect(() => {
        if (messagesRef.current) messagesRef.current?.scrollIntoView();
    }, [screenMessages]);

    useEffect(() => {
        updateScreenMessage("Connecting");

        const ioSocket = (socket.current = io(`${url}/teranex`));
        ioSocket.on("connect", () => {
            updateScreenMessage("Nxt service connection established");
            ioSocket.emit("subscribe", {nodeId, ip, port});
            // @ts-ignore
            window.teranexCommand = (commands: Array<string>) =>
                ioSocket.emit("commands", {
                    nodeId,
                    ip,
                    port,
                    commands,
                });
        });
        ioSocket.on("subscribed", () => {
            updateScreenMessage("Device connection established");
            setInitDone(true);
        });
        return () => {
            ioSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (initDone && socket.current) {
            updateScreenMessage("Updating device state");
            socket.current.emit("commands", {
                nodeId,
                ip,
                port,
                commands: TERANEX_COMMANDS_SET.INFO,
            });
        }
    }, [initDone]);

    const handleDeviceCommandResult = useCallback((result: string) => {
        const panelLockIndex = result.indexOf("Panel lock: ");
        const panelLock = panelLockIndex
            ? result.substring(panelLockIndex + 12, panelLockIndex + 17) === "true"
            : false;
        const remLockIndex = result.indexOf("Remote lock: ");
        const remLock = remLockIndex
            ? result.substring(remLockIndex + 13, remLockIndex + 18) === "true"
            : false;
        teranexDispatch({type: "device", payload: {panelLock, remLock}});
    }, []);

    const handleVideoInputCommandResult = useCallback(
        (result: string) => {
            let video: Video = null;
            const videoSourceIndex = result.indexOf("Video source: ");
            if (videoSourceIndex !== -1) {
                const start = videoSourceIndex + 14;
                if (result.startsWith("SDI", start)) video = "sdi";
                if (result.startsWith("HDMI", start)) video = "hdmi";
                if (result.startsWith("Optical", start)) video = "opt";
            }
            let audio: Audio = null;
            const audioSourceIndex = result.indexOf("Audio source: ");
            if (audioSourceIndex !== -1) {
                const start = audioSourceIndex + 14;
                if (result.startsWith("Embedded", start)) audio = "embed";
                if (result.startsWith("AES", start)) audio = "aes";
                if (result.startsWith("RCA", start) || result.startsWith("DB25", start))
                    audio = "anlg";
            }
            if (video) {
                let tc: boolean = false;
                const timeCodeModeIndex = result.indexOf("Timecode present: ");
                if (timeCodeModeIndex !== -1) {
                    const start = timeCodeModeIndex + 18;
                    tc = !result.startsWith("None", start);
                }
                let cc: boolean = false;
                const closedCaptionsIndex = result.indexOf("Closed captioning present: ");
                if (closedCaptionsIndex !== -1) {
                    const start = closedCaptionsIndex + 27;
                    cc = !result.startsWith("None", start);
                }
                const vid = !!video;
                teranexDispatch({type: "videoInput", payload: {video}});
                teranexDispatch({type: "systemStatus", payload: {tc, cc, vid}});
            }
            if (audio) {
                let audioStatus: AudioStatus = {...teranexInitialState.audioStatus};
                switch (audio) {
                    case "embed":
                        // @ts-ignore
                        Object.keys(audioStatus).forEach((key) => (audioStatus[key] = true));
                        break;
                    case "aes":
                        audioStatus["1"] = true;
                        audioStatus["2"] = true;
                        audioStatus["3"] = true;
                        audioStatus["4"] = true;
                        break;
                    case "anlg":
                        audioStatus["1"] = true;
                        audioStatus["2"] = true;
                        break;
                }
                teranexDispatch({type: "audioInput", payload: {audio}});
                teranexDispatch({type: "audioStatus", payload: {audioStatus}});
            }

            if (processingCommand === TERANEX_UPDATE.VIDEO_INPUT) {
                if (videoSourceIndex !== -1) {
                    updateScreenMessage(`Video input: ${video}`);
                }
                if (audioSourceIndex !== -1) {
                    updateScreenMessage(`Audio input: ${audio}`);
                }
                commandDispatch({type: "video", payload: null});
                commandDispatch({type: "audio", payload: null});
                setProcessingCommand(null);
            }
        },
        [processingCommand]
    );

    const handleVideoOutputCommandResult = useCallback(
        (result: string) => {
            let format: Format = null;
            let frame: Frame = null;
            let rate: Rate = null;
            const videoModeIndex = result.indexOf("Video mode: ");
            if (videoModeIndex !== -1) {
                const start = videoModeIndex + 12;
                const end = result.indexOf("\n", start);
                const videoMode = result.substring(start, end);
                const videoModeComponents = destructVideoMode(videoMode);
                format = videoModeComponents.format;
                frame = videoModeComponents.frame;
                rate = videoModeComponents.rate;
            }
            let aspect: AspectRatio = null;
            const aspectRatioIndex = result.indexOf("Aspect ratio: ");
            if (aspectRatioIndex !== -1) {
                const start = aspectRatioIndex + 14;
                if (result.startsWith("Anamorphic", start)) aspect = "anam";
                if (result.startsWith("LetterBox", start)) aspect = "lbox-pbox";
                if (result.startsWith("Smart", start)) aspect = "smart";
                if (result.startsWith("14x9", start)) aspect = "14:9";
                if (result.startsWith("CentreCut", start)) aspect = "ccut-zoom";
                if (result.startsWith("Adj", start)) aspect = "adj";
            }
            if (format && frame && rate)
                teranexDispatch({type: "videoOutput", payload: {format, frame, rate}});
            if (aspect) teranexDispatch({type: "aspectRatio", payload: {aspect}});
            if (processingCommand === TERANEX_UPDATE.VIDEO_OUTPUT) {
                if (videoModeIndex !== -1) {
                    updateScreenMessage(`Video mode: ${format}${frame}${rate}`);
                }
                if (aspectRatioIndex !== -1) {
                    updateScreenMessage(`Aspect ratio: ${aspect}`);
                }
                commandDispatch({type: "format", payload: null});
                commandDispatch({type: "frame", payload: null});
                commandDispatch({type: "rate", payload: null});
                commandDispatch({type: "aspect", payload: null});
                setProcessingCommand(null);
            }
        },
        [teranex, command, processingCommand]
    );

    const handleAncillaryDataCommandResult = useCallback((result: string) => {
        let tc: boolean = false;
        const timeCodeModeIndex = result.indexOf("Timecode mode: ");
        if (timeCodeModeIndex) {
            const start = timeCodeModeIndex + 15;
            tc = !result.startsWith("Off", start);
        }
        let cc: boolean = false;
        const closedCaptionsIndex = result.indexOf("CC enabled: ");
        if (closedCaptionsIndex) {
            const start = closedCaptionsIndex + 12;
            cc = !result.startsWith("false", start);
        }
        teranexDispatch({type: "ancillaryData", payload: {tc, cc}});
    }, []);

    const handleCommandResult = useCallback(
        (data: any) => {
            data.data?.forEach((result: string) => {
                if (result.startsWith(TERANEX_RESPONSE.DEVICE)) handleDeviceCommandResult(result);
                if (result.startsWith(TERANEX_RESPONSE.VIDEO_INPUT))
                    handleVideoInputCommandResult(result);
                if (result.startsWith(TERANEX_RESPONSE.VIDEO_OUTPUT))
                    handleVideoOutputCommandResult(result);
                if (result.startsWith(TERANEX_RESPONSE.ANCILLARY_DATA))
                    handleAncillaryDataCommandResult(result);
                if (result.startsWith(TERANEX_RESPONSE.GENLOCK)) handleGenlockCommandResult(result);
            });
            console.log(`Teranex response ${JSON.stringify(data)}`);
        },
        [
            handleDeviceCommandResult,
            handleVideoInputCommandResult,
            handleVideoOutputCommandResult,
            handleAncillaryDataCommandResult,
        ]
    );

    useEffect(() => {
        if (socket.current) {
            socket.current.on("result", handleCommandResult);
            socket.current.on("error", handleCommandError);
        }
        return () => {
            socket.current?.removeAllListeners("result");
            socket.current?.removeAllListeners("error");
        };
    }, [handleCommandResult]);

    const handleGenlockCommandResult = useCallback((result: string) => {
        let ref: boolean = false;
        const typeIndex = result.indexOf("Type: ");
        if (typeIndex) {
            const start = typeIndex + 6;
            ref = result.startsWith("External", start);
        }
        teranexDispatch({type: "genLock", payload: {ref}});
    }, []);

    const handleCommandError = useCallback((error) => {
        console.log(`Teranex error ${JSON.stringify(error)}`);
    }, []);

    const updateScreenMessage = useCallback((message: string, add: boolean = true) => {
        if (add) {
            setScreenMessages((messages) => [...messages, message]);
        } else {
            setScreenMessages([message]);
        }
    }, []);

    const handleTypeChanged = useCallback((event: SyntheticEvent<HTMLButtonElement>) => {
        const payload = event.currentTarget.dataset["mode"] === "in" ? "in" : "out";
        if (payload) teranexDispatch({type: "mode", payload});
    }, []);

    const handleSetupChanged = useCallback(
        (type: string) => (event: SyntheticEvent<HTMLButtonElement>) => {
            const payload = event.currentTarget.dataset[type];
            // @ts-ignore
            commandDispatch({type, payload});
        },
        [teranex]
    );

    const processCommand = useCallback((teranexCommand: string, commands: Array<string>) => {
        console.log("CMD", commands);
        if (socket.current) {
            socket.current.emit("commands", {nodeId, ip, port, commands});
            setProcessingCommand(teranexCommand);
        }
    }, []);

    const handleApply = useCallback(() => {
        //todo: make it better
        if (!socket.current) return;

        const commands = [];
        if (teranex.mode === "in") {
            const video = command.video;
            const audio = command.audio;
            if (video) {
                let videoInput;
                if (video === "sdi") {
                    videoInput = "SDI1";
                } else if (video === "hdmi") {
                    videoInput = "HDMI";
                } else if (video === "opt") {
                    videoInput = "Optical";
                }
                commands.push(`${TERANEX_UPDATE.VIDEO_INPUT}Video source: ${videoInput}\n\n`);
            }
            if (audio) {
                let audioInput;
                if (audio === "embed") {
                    audioInput = "Embedded";
                } else if (audio === "aes") {
                    audioInput = "AES";
                } else if (audio === "anlg") {
                    audioInput = "RCA";
                }
                commands.push(`${TERANEX_UPDATE.VIDEO_INPUT}Audio source: ${audioInput}\n\n`);
            }
            processCommand(TERANEX_UPDATE.VIDEO_INPUT, commands);
        } else {
            const format = command.format || teranex.format;
            const frame = command.frame || teranex.frame;
            const rate = command.rate || teranex.rate;
            const aspect: AspectRatio = command.aspect || teranex.aspect;
            let videoMode;
            switch (format) {
                case "2k":
                    videoMode = `${format + " DCI " + rate + frame}`;
                    break;
                default:
                    // @ts-ignore
                    videoMode = `${format + frame + rate}`;
            }
            let aspectRatio;
            if (aspect === "anam") {
                aspectRatio = "Anamorphic";
            } else if (aspect === "14:9") {
                aspectRatio = "14x9";
            } else if (aspect === "lbox-pbox") {
                aspectRatio = "LetterBox";
            } else if (aspect === "ccut-zoom") {
                aspectRatio = "CentreCut";
            } else if (aspect === "smart") {
                aspectRatio = "Smart";
            } else if (aspect === "adj") {
                aspectRatio = "Adj";
            }
            //todo: how to combine this commands together?
            const videModeUpdateCommand = `${TERANEX_UPDATE.VIDEO_OUTPUT}Video mode: ${videoMode}\n\n`;
            const aspectRatioUpdateCommand = `${TERANEX_UPDATE.VIDEO_OUTPUT}Aspect ratio: ${aspectRatio}\n\n`;
            processCommand(TERANEX_UPDATE.VIDEO_OUTPUT, [
                videModeUpdateCommand,
                aspectRatioUpdateCommand,
            ]);
        }
    }, [teranex, command]);

    return (
        <div className="teranex-container">
            <div className="teranex">
                <div className="teranex-block">
                    <div className="teranex-title">&nbsp;</div>
                    <button
                        data-mode={"in"}
                        disabled={teranex.mode === null}
                        onClick={handleTypeChanged}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === null && "disabled",
                            teranex.mode === "in" && "active"
                        )}>
                        IN
                    </button>
                    <div className="teranex-logo">NXT</div>
                    <button
                        data-mode={"out"}
                        disabled={teranex.mode === null}
                        onClick={handleTypeChanged}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === null && "disabled",
                            teranex.mode === "out" && "active"
                        )}>
                        OUT
                    </button>
                </div>
                <div className={"teranex-block"}>
                    <div className={"teranex-title"}>Video</div>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.video === "sdi" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.video !== "sdi" &&
                                command.video === "sdi" &&
                                "selected"
                        )}
                        data-video={"sdi"}
                        onClick={handleSetupChanged("video")}>
                        SDI
                    </button>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.video === "hdmi" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.video !== "hdmi" &&
                                command.video === "hdmi" &&
                                "selected"
                        )}
                        data-video={"hdmi"}
                        onClick={handleSetupChanged("video")}>
                        HDMI
                    </button>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.video === "opt" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.video !== "opt" &&
                                command.video === "opt" &&
                                "selected"
                        )}
                        data-video={"opt"}
                        onClick={handleSetupChanged("video")}>
                        OPT
                    </button>
                </div>
                <div className={"teranex-block"}>
                    <div className={"teranex-title"}>Audio</div>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.audio === "embed" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.audio !== "embed" &&
                                command.audio === "embed" &&
                                "selected"
                        )}
                        data-audio={"embed"}
                        onClick={handleSetupChanged("audio")}>
                        EMBED
                    </button>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.audio === "aes" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.audio !== "aes" &&
                                command.audio === "aes" &&
                                "selected"
                        )}
                        data-audio={"aes"}
                        onClick={handleSetupChanged("audio")}>
                        AES
                    </button>
                    <button
                        disabled={teranex.mode === "out"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "in"
                                ? teranex.audio === "anlg" && "active"
                                : "disabled",
                            teranex.mode === "in" &&
                                teranex.audio !== "anlg" &&
                                command.audio === "anlg" &&
                                "selected"
                        )}
                        data-audio={"anlg"}
                        onClick={handleSetupChanged("audio")}>
                        ANLG
                    </button>
                </div>
                <div className={"teranex-block"}>
                    <div className="teranex-title teranex-title-border">Format</div>
                    <ul className={"teranex-group"}>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "486" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "486" &&
                                        command.format === "486" &&
                                        "selected"
                                )}
                                data-format={"486"}
                                onClick={handleSetupChanged("format")}>
                                486
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "720" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "720" &&
                                        command.format === "720" &&
                                        "selected"
                                )}
                                data-format={"720"}
                                onClick={handleSetupChanged("format")}>
                                720
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "2k" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "2k" &&
                                        command.format === "2k" &&
                                        "selected"
                                )}
                                data-format={"2k"}
                                onClick={handleSetupChanged("format")}>
                                2K
                            </button>
                        </li>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "576" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "576" &&
                                        command.format === "576" &&
                                        "selected"
                                )}
                                data-format={"576"}
                                onClick={handleSetupChanged("format")}>
                                576
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "1080" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "1080" &&
                                        command.format === "1080" &&
                                        "selected"
                                )}
                                data-format={"1080"}
                                onClick={handleSetupChanged("format")}>
                                1080
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.format === "ultraHd" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.format !== "ultraHd" &&
                                        command.format === "ultraHd" &&
                                        "selected"
                                )}
                                data-format={"ultraHd"}
                                onClick={handleSetupChanged("format")}>
                                ULTRA HD
                            </button>
                        </li>
                    </ul>
                </div>
                <div className={"teranex-block"}>
                    <div className={"teranex-title"}>Frame</div>
                    <button
                        disabled={teranex.mode === "in"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "out" ? teranex.frame === "p" && "active" : "disabled",
                            teranex.mode === "out" &&
                                teranex.frame !== "p" &&
                                command.frame === "p" &&
                                "selected"
                        )}
                        data-frame={"p"}
                        onClick={handleSetupChanged("frame")}>
                        P
                    </button>
                    <button
                        disabled={teranex.mode === "in"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "out" ? teranex.frame === "i" && "active" : "disabled",
                            teranex.mode === "out" &&
                                teranex.frame !== "i" &&
                                command.frame === "i" &&
                                "selected"
                        )}
                        data-frame={"i"}
                        onClick={handleSetupChanged("frame")}>
                        I
                    </button>
                    <button
                        disabled={teranex.mode === "in"}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === "out"
                                ? teranex.frame === "psf" && "active"
                                : "disabled",
                            teranex.mode === "out" &&
                                teranex.frame !== "psf" &&
                                command.frame === "psf" &&
                                "selected"
                        )}
                        data-frame={"psf"}
                        onClick={handleSetupChanged("frame")}>
                        PSF
                    </button>
                </div>
                <div className={"teranex-block"}>
                    <div className="teranex-title teranex-title-border">Rate</div>
                    <ul className={"teranex-group"}>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "23.98" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "23.98" &&
                                        command.rate === "23.98" &&
                                        "selected"
                                )}
                                data-rate={"23.98"}
                                onClick={handleSetupChanged("rate")}>
                                23.98
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "29.97" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "29.97" &&
                                        command.rate === "29.97" &&
                                        "selected"
                                )}
                                data-rate={"29.97"}
                                onClick={handleSetupChanged("rate")}>
                                29.97
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "59.94" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "59.94" &&
                                        command.rate === "59.94" &&
                                        "selected"
                                )}
                                data-rate={"59.94"}
                                onClick={handleSetupChanged("rate")}>
                                59.94
                            </button>
                        </li>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "24" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "24" &&
                                        command.rate === "24" &&
                                        "selected"
                                )}
                                data-rate={"24"}
                                onClick={handleSetupChanged("rate")}>
                                24
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "30" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "30" &&
                                        command.rate === "30" &&
                                        "selected"
                                )}
                                data-rate={"30"}
                                onClick={handleSetupChanged("rate")}>
                                30
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "60" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "60" &&
                                        command.rate === "60" &&
                                        "selected"
                                )}
                                data-rate={"60"}
                                onClick={handleSetupChanged("rate")}>
                                60
                            </button>
                        </li>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "25" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "25" &&
                                        command.rate === "25" &&
                                        "selected"
                                )}
                                data-rate={"25"}
                                onClick={handleSetupChanged("rate")}>
                                25
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.rate === "50" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.rate !== "50" &&
                                        command.rate === "50" &&
                                        "selected"
                                )}
                                data-rate={"50"}
                                onClick={handleSetupChanged("rate")}>
                                50
                            </button>
                        </li>
                    </ul>
                </div>
                <div className={"teranex-block"}>
                    <div id="teranex-screen" className="teranex-screen">
                        {screenMessages.map((message, index) => (
                            <div key={index}>{message}</div>
                        ))}
                        <div ref={messagesRef} />
                    </div>
                </div>
                <div className={"teranex-block"}>
                    <div className="teranex-title teranex-title-border">Aspect</div>
                    <ul className={"teranex-group"}>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "anam" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "anam" &&
                                        command.aspect === "anam" &&
                                        "selected"
                                )}
                                data-aspect={"anam"}
                                onClick={handleSetupChanged("aspect")}>
                                ANAM
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "lbox-pbox" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "lbox-pbox" &&
                                        command.aspect === "lbox-pbox" &&
                                        "selected"
                                )}
                                data-aspect={"lbox-pbox"}
                                onClick={handleSetupChanged("aspect")}>
                                LBOX PBOX
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "smart" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "smart" &&
                                        command.aspect === "smart" &&
                                        "selected"
                                )}
                                data-aspect={"smart"}
                                onClick={handleSetupChanged("aspect")}>
                                SMART
                            </button>
                        </li>
                        <li>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "14:9" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "14:9" &&
                                        command.aspect === "14:9" &&
                                        "selected"
                                )}
                                data-aspect={"14:9"}
                                onClick={handleSetupChanged("aspect")}>
                                14:9
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "ccut-zoom" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "ccut-zoom" &&
                                        command.aspect === "ccut-zoom" &&
                                        "selected"
                                )}
                                data-aspect={"ccut-zoom"}
                                onClick={handleSetupChanged("aspect")}>
                                CCUT ZOOM
                            </button>
                            <button
                                disabled={teranex.mode === "in"}
                                className={clsx(
                                    "teranex-button",
                                    teranex.mode === "out"
                                        ? teranex.aspect === "adj" && "active"
                                        : "disabled",
                                    teranex.mode === "out" &&
                                        teranex.aspect !== "adj" &&
                                        command.aspect === "adj" &&
                                        "selected"
                                )}
                                data-aspect={"adj"}
                                onClick={handleSetupChanged("aspect")}>
                                ADJ
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="teranex-block stretch">
                    <div>
                        <div className={"teranex-title"}>AUDIO STATUS</div>
                        <ul className="teranex-group horizontal">
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["1"] && "active"
                                    )}>
                                    1
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["2"] && "active"
                                    )}>
                                    2
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["3"] && "active"
                                    )}>
                                    3
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["4"] && "active"
                                    )}>
                                    4
                                </button>
                            </li>
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["5"] && "active"
                                    )}>
                                    5
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["6"] && "active"
                                    )}>
                                    6
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["7"] && "active"
                                    )}>
                                    7
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["8"] && "active"
                                    )}>
                                    8
                                </button>
                            </li>
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["9"] && "active"
                                    )}>
                                    9
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["10"] && "active"
                                    )}>
                                    10
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["11"] && "active"
                                    )}>
                                    11
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["12"] && "active"
                                    )}>
                                    12
                                </button>
                            </li>
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["13"] && "active"
                                    )}>
                                    13
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["14"] && "active"
                                    )}>
                                    14
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["15"] && "active"
                                    )}>
                                    15
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.audioStatus["16"] && "active"
                                    )}>
                                    16
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div style={{marginTop: ".6rem"}}>
                        <div className={"teranex-title"}>SYSTEM STATUS</div>
                        <ul className="teranex-group horizontal">
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.vid && "active"
                                    )}>
                                    VID
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.ref && "active"
                                    )}>
                                    REF
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.ps && "active"
                                    )}>
                                    PS
                                </button>
                                <button className="teranex-button small uncontrolled">
                                    &nbsp;
                                </button>
                            </li>
                            <li>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.tc && "active"
                                    )}>
                                    TC
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.cc && "active"
                                    )}>
                                    CC
                                </button>
                                <button
                                    className={clsx(
                                        "teranex-button small uncontrolled",
                                        teranex.systemStatus.eth && "active"
                                    )}>
                                    &#8672;&#8674;
                                </button>
                                <button className="teranex-button small uncontrolled" />
                            </li>
                        </ul>
                    </div>
                </div>
                <div className={"teranex-block"}>
                    <div className={"teranex-title"}>&nbsp;</div>
                    <button
                        disabled={teranex.mode === null}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === null && "disabled",
                            teranex.panelLock && "active"
                        )}>
                        PANEL LOCK
                    </button>
                    <button
                        disabled={teranex.mode === null || processingCommand !== null}
                        className={clsx(
                            "teranex-button",
                            (teranex.mode === null || processingCommand !== null) && "disabled",
                            teranex.mode === "in" &&
                                ((command.video && command.video !== teranex.video) ||
                                    (command.audio && command.audio !== teranex.audio)) &&
                                "selected",
                            teranex.mode === "out" &&
                                ((command.format && command.format !== teranex.format) ||
                                    (command.frame && command.frame !== teranex.frame) ||
                                    (command.rate && command.rate !== teranex.rate) ||
                                    (command.aspect && command.aspect !== teranex.aspect)) &&
                                "selected"
                        )}
                        onClick={handleApply}>
                        APPLY
                    </button>
                    <button
                        disabled={teranex.mode === null}
                        className={clsx(
                            "teranex-button",
                            teranex.mode === null && "disabled",
                            teranex.remLock && "active"
                        )}>
                        REM LOCK
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TeranexController;
