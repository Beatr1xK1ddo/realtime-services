export enum ESubscriptionType {
    monitoring = "monitoring",
    qos = "qos",
    node = "node",
    app = "app",
    txr = "txr",
    tsMonitoring = "tsMonitoring",
}

export interface IOnDataHandler {
    (key: string, data: string): void;
}

export interface INodeSubscribeOrigin {
    nodeId: number | number[];
    type: INodeEventType;
}

export interface IIpPortOrigin {
    nodeId: number;
    ip: string;
    port: number;
}

export interface INodeIdOrigin {
    nodeId: number;
}

export interface IAppIdAppTypeOrigin {
    nodeId: number;
    appId: number;
    appType: string;
}

export interface ISubscribeEvent<T = any> {
    subscriptionType: ESubscriptionType;
    origin: T;
}

export type IUnsubscribeEvent<T = any> = ISubscribeEvent<T>;

export interface IMonitoringRowData {
    time: number;
    tsTotalRate: number;
    tsDataRate: number;
    p1Stats: {
        syncLosses: number;
        ccErrors: number;
    };
}

export interface IMonitoringData {
    moment: number;
    monitoring: {
        bitrate: number;
        muxrate: number;
    };
    errors: {
        syncLosses: number;
        cc: number;
    };
}

export enum EQosItem {
    good,
    warning,
    bad,
}

export interface IQosData {
    items: Array<EQosItem>;
    quality: number;
}

export type IAppDataRow = IAppStatusDataRaw | IAppTimingDataRaw;

export type IAppData = IAppStatusData | IAppTimingData;

export interface IAppStatusDataRaw {
    appId: number;
    appType: string;
    status: string;
    statusChange: string;
}

export interface IAppTimingDataRaw {
    appId: number;
    appType: string;
    startedAt: number;
}

export type IAppStatusData = Omit<IAppStatusDataRaw, "appId" | "appType">;

export type IAppTimingData = Omit<IAppTimingDataRaw, "appId" | "appType">;

export type INodeDataRow = INodePingDataRaw | INodeSystemStateDataRow | INodeStatusData;

export type INodeData = INodePingData | INodeSystemStateData | INodeStatusData;

export type INodeEventType = "ping" | "system" | "status";

//todo kan: fix all naming according to this
export interface INodePingDataRaw {
    id: number;
    type: INodeEventType;
    lastPing: number;
}

export type INodePingData = Omit<INodePingDataRaw, "id">;

export interface INodeSystemStateDataRow {
    id: number;
    type: INodeEventType;
    cpu: number;
    memoryUsed: number;
    memoryTotal: number;
    loadAverage: number;
}

export type INodeSystemStateData = Omit<INodeSystemStateDataRow, "id">;

export interface INodeStatusData {
    id: number;
    type: INodeEventType;
    online: boolean;
}

export type IPubSubData = INodeDataRow | IAppDataRow;

export interface IDataEvent<T, P> extends ISubscribeEvent<T> {
    // payload: IMonitoringData | Array<IMonitoringData> | IQosData | IPubSubData;
    payload: P;
}

export interface IDataEvent<T, P> extends ISubscribeEvent<T> {
    // payload: IMonitoringData | Array<IMonitoringData> | IQosData | INodeData | IAppData;
    payload: P;
}

export type ISubscribedEvent<T, P> = IDataEvent<T, P>;

export interface IAppDataSubscribedEvent {
    status: IAppStatusData;
    runtime: IAppTimingData;
}

// ts monitoring
export interface IProgramPidData {
    pid: number;
    streamType: number;
    streamTypeStr: string;
    pcrPid: boolean;
    ecmPid: boolean;
    caSystemIds: Array<number>; // not sure taht numbers
    streamId: number;
    streamIdStr: string;
    pcrIntervalValid: boolean;
    pcrInterval: number;
    rate: number;
    ratePercent: number;
}

export interface ITsMonitoringData {
    seqNo: number;
    statsSeqNo: number;
    time: number;
    programs: {
        programs: [
            {
                programNumber: number;
                pmtPid: number;
                pcrPid: number;
                pids: Array<IProgramPidData>;
                encrypted: boolean;
                rate: number;
                ratePercent: number;
                eitScheduleFlag: number;
                eitPresentFollowingFlag: number;
                runningStatus: number;
                runningStatusStr: string;
                freeCaMode: number;
                serviceDescriptor: {
                    type: number;
                    typeStr: string;
                    serviceType: number;
                    serviceTypeStr: string;
                    providerNameLength: number;
                    providerName: string;
                    providerNameBytes: string;
                    serviceNameLength: number;
                    serviceName: string;
                    serviceNameBytes: string;
                };
            }
        ];
    };
}

// txr

export interface ITxrNodeData {
    source: boolean;
    output: boolean;
    connection: boolean;
    connectedTo: string;
    // connectionType: string; ??
    rtt: number;
    latency: number;
    quality: number;
    packetsSent: number;
    packetsRetx: number;
    packetsLost: number;
    packetsLate: number;
    txrRecovered: number;
    fexRecovered: number;
    p1SyncLoss: number;
    p1CCErrors: number;
}

export interface ITxrNodeDataRow<T> {
    modules?: Array<T>;
}

export interface ITxrRxModuleData {
    has_output?: boolean;
    has_connection?: boolean;
    connected_to?: string;
    real_buffer_time?: number;
    rtt?: {
        active?: number;
    };
    quality?: {
        quality_60s?: number;
    };
    packet_rate?: {
        packets_sent_60s?: number; // packetsSent
        packets_sent_total?: number; // packetsSent
        packets_retx_60s?: number; // packetsRetx
        packets_retx_total?: number; // packetsRetx
        packets_lost_60s?: number; // packetsLost
        packets_lost_total?: number; // packetsLost
        packets_late_60s?: number; // packetsLate
        packets_late_total?: number; // packetsLate
        packets_txr_recovered_60s?: number; // TXRRecovered
        packets_txr_recovered_total?: number; // TXRRecovered
        packets_fec_recovered_60s?: number; // FECRecovered
        packets_fec_recovered_total?: number; // FECRecovered
    };
    ts_monitor?: {
        sync_loss_60s: number; // P1SyncLoss
        cc_errors_60s: number; // P1CCErrors
    };
}

export interface ITxrTxModuleData extends ITxrRxModuleData {
    has_source: boolean;
}
