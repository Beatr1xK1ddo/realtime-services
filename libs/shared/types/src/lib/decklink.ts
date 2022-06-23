export type IDecklinkLiveMonitor = {
    current_flags: string;
    current_mode: string;
    detected_flags: string;
    detected_mode: string;
    id: number;
    input: number;
    input_name: string;
    locked: string;
    modes: string[];
    name: string;
    pixel_format: string;
    status: string;
};

export type IDecklinkNodeEvent = {
    nodeId: number;
    data: IDecklinkLiveMonitor;
};
