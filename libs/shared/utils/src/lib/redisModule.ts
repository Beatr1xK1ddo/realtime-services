import {ITxrNodeData, ITxrNodeDataRaw} from "@socket/shared-types";
import {
    IAppDataRaw,
    IAppStatusDataRaw,
    IAppTimingDataRaw,
    INodeDataRaw,
    IPubSubData,
    ISubscribedEvent,
    ITxrRxModuleData,
    ITxrTxModuleData,
    ESubscriptionType,
    INodeIdOrigin,
} from "@socket/shared-types";

// app
export const isRealtimeAppData = (type: IPubSubData): type is IAppDataRaw => {
    return "appId" in type;
};

export const isIAppStatusDataRaw = (type: IAppDataRaw): type is IAppStatusDataRaw => {
    return type && "status" in type;
};

export const isIAppTimingDataRaw = (type: IAppDataRaw): type is IAppTimingDataRaw => {
    return type && "startedAt" in type;
};

// node
export const isRealtimeNodeData = (type: IPubSubData): type is INodeDataRaw => {
    return type && "id" in type && "type" in type;
};

export const txrClientEventMapper = (
    rx: ITxrNodeDataRaw<ITxrRxModuleData>,
    tx: ITxrNodeDataRaw<ITxrTxModuleData>,
    origin: INodeIdOrigin
) => {
    let payload: ITxrNodeData;
    const rxData = rx?.modules?.[0];
    const txData = tx?.modules?.[0];
    const packetsSent = (() => {
        const rxValue = rxData?.packet_rate?.packets_sent_60s / rxData?.packet_rate?.packets_sent_total;
        const txValue = txData?.packet_rate?.packets_sent_60s / txData?.packet_rate?.packets_sent_total;
        return rxValue ?? txValue;
    })();
    const packetsRetx = (() => {
        const rxValue = rxData?.packet_rate?.packets_retx_60s / rxData?.packet_rate?.packets_retx_total;
        const txValue = txData?.packet_rate?.packets_retx_60s / txData?.packet_rate?.packets_retx_total;
        return rxValue ?? txValue;
    })();
    const packetsLost = (() => {
        const rxValue = rxData?.packet_rate?.packets_lost_60s / rxData?.packet_rate?.packets_lost_total;
        const txValue = txData?.packet_rate?.packets_lost_60s / txData?.packet_rate?.packets_lost_total;
        return rxValue ?? txValue;
    })();
    const packetsLate = (() => {
        const rxValue = rxData?.packet_rate?.packets_late_60s / rxData?.packet_rate?.packets_late_total;
        const txValue = txData?.packet_rate?.packets_late_60s / txData?.packet_rate?.packets_late_total;
        return rxValue ?? txValue;
    })();
    const txrRecovered = (() => {
        const rxValue =
            rxData?.packet_rate?.packets_txr_recovered_60s / rxData?.packet_rate?.packets_txr_recovered_total;
        const txValue =
            txData?.packet_rate?.packets_txr_recovered_60s / txData?.packet_rate?.packets_txr_recovered_total;
        return rxValue ?? txValue;
    })();
    const fexRecovered = (() => {
        const rxValue =
            rxData?.packet_rate?.packets_fec_recovered_60s / rxData?.packet_rate?.packets_fec_recovered_total;
        const txValue =
            txData?.packet_rate?.packets_fec_recovered_60s / txData?.packet_rate?.packets_fec_recovered_total;
        return rxValue ?? txValue;
    })();
    payload = {
        source: txData?.has_source,
        output: rxData?.has_output ?? txData?.has_output,
        connection: rxData?.has_connection ?? txData?.has_connection,
        connectedTo: rxData?.connected_to ?? txData?.connected_to,
        rtt: rxData?.rtt?.active ?? txData?.rtt?.active,
        latency: rxData?.real_buffer_time ?? txData?.real_buffer_time,
        quality: rxData?.quality?.quality_60s ?? txData?.quality?.quality_60s,
        packetsSent,
        packetsRetx,
        packetsLost,
        packetsLate,
        txrRecovered,
        fexRecovered,
        p1SyncLoss: rxData?.ts_monitor?.sync_loss_60s ?? txData?.ts_monitor?.sync_loss_60s,
        p1CCErrors: rxData?.ts_monitor?.cc_errors_60s ?? txData?.ts_monitor?.cc_errors_60s,
        // connectionType: string; ??
    };

    const result: ISubscribedEvent<INodeIdOrigin, ITxrNodeData> = {
        subscriptionType: ESubscriptionType.txr,
        origin,
        payload,
    };
    return result;
};
