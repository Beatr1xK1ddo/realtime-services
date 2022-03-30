"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    spts: {
        selectQuery: `
            SELECT
                t.id appId,
                'spts' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.output_ip nodeIp,
                t.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM sptses AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.output_ip = ':nodeIp'
                AND t.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE sptses SET halt_comeback = false WHERE id = :appId;`,
    },
    mpts: {
        selectQuery: `
            SELECT
                t.id appId,
                'mpts' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.output_ip nodeIp,
                t.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM mptses AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.output_ip = ':nodeIp'
                AND t.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE mptses SET halt_comeback = false WHERE id = :appId;`,
    },
    tsdecrypt: {
        selectQuery: `
            SELECT
                t.id appId,
                'tsdecrypt' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.output_ip nodeIp,
                t.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM tsdecrypts AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.output_ip = ':nodeIp'
                AND t.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE tsdecrypts SET halt_comeback = false WHERE id = :appId;`,
    },
    static_generator: {
        selectQuery: `
            SELECT
                t.id appId,
                'static_generator' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.output_ip nodeIp,
                t.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM static_generator AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.output_ip = ':nodeIp'
                AND t.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE static_generator SET halt_comeback = false WHERE id = :appId;`,
    },
    su_playlist_channel: {
        selectQuery: `
            SELECT
                t.id appId,
                'su_playlist_channel' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.output_ip nodeIp,
                t.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM su_playlist_channels AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.output_ip = ':nodeIp'
                AND t.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE su_playlist_channels SET halt_comeback = false WHERE id = :appId;`,
    },
    timeshifting: {
        selectQuery: `
            SELECT
                t.id appId,
                'timeshifting' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.destination_ip nodeIp,
                t.destination_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM timeshifting AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE t.id = :appId
                AND (t.status = 'active' OR t.status = 'error')
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.destination_ip = ':nodeIp'
                AND t.destination_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE timeshifting SET halt_comeback = false WHERE id = :appId;`,
    },
    tsfailover: {
        selectQuery: `
            SELECT
                t.id appId,
                'tsfailover' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.destination_ip nodeIp,
                t.destination_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM tsfailovers AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE t.id = :appId
                AND (t.status = 'active' OR t.status = 'error')
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.destination_ip = ':nodeIp'
                AND t.destination_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE tsfailovers SET halt_comeback = false WHERE id = :appId;`,
    },
    tsforward: {
        selectQuery: `
            SELECT
                t.id appId,
                'tsforward' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.destination_ip nodeIp,
                t.destination_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback
            FROM ts_forwards AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.destination_ip = ':nodeIp'
                AND t.destination_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE ts_forwards SET halt_comeback = false WHERE id = :appId;`,
    },
    converter: {
        selectQuery: `
            SELECT
                t.id appId,
                'converter' appType,
                t.name appName,

                n.id nodeId,
                n.name nodeName,
                t.destination_ip nodeIp,
                t.destination_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,

                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM converters AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.destination_ip = ':nodeIp'
                AND t.destination_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE converters SET halt_comeback = false WHERE id = :appId;`,
    },
    tsplayer: {
        selectQuery: `
            SELECT
                t.id appId,
                'tsplayer' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.destination_ip nodeIp,
                t.destination_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM ts_players AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.destination_ip = ':nodeIp'
                AND t.destination_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE ts_players SET halt_comeback = false WHERE id = :appId;`,
    },
    // ingest_recording: {
    //     selectQuery: `
    //         SELECT
    //             i.id appId,
    //             'ingest_recording' appType,
    //             i.name appName,
    //
    //             n.id nodeId,
    //             n.name nodeName,
    //             i.source_ip_address nodeIp,
    //             i.source_ip_port nodePort,
    //             TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    //
    //             i.company_id companyId,
    //             i.halt_comeback haltComeback,
    //             i.halt_until haltUntil
    //         FROM ingest_recording AS i
    //             LEFT JOIN mam_storage m ON i.mam_starage_id = m.id
    //             LEFT JOIN nodes n ON m.node_id = n.id
    //         WHERE (i.status = 'active' OR i.status = 'error')
    //             AND i.id = :appId
    //             AND i.type = 'ip'
    //             AND (i.ignore_alerts = false OR i.ignore_alerts IS NULL)
    //             AND (UNIX_TIMESTAMP(i.halt_until) < :lastRuntime OR i.halt_until IS NULL)
    //             AND m.node_id = :nodeId
    //             AND i.source_ip_address = ':nodeIp'
    //             AND i.source_ip_port = :nodePort
    //         LIMIT 1;
    //     `,
    //     updateQuery: `UPDATE ingest_recording SET halt_comeback = false WHERE id = :appId;`,
    // },
    txr: {
        selectQuery: `
            SELECT
                t.id appId,
                'txr' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.rx_output_ip nodeIp,
                t.rx_output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM txrs AS t
                LEFT JOIN nodes n ON t.rx_node_id = n.id
            WHERE t.id = :appId
                AND (t.status = 'active' OR t.status = 'error')
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.rx_node_id = :nodeId
                AND t.rx_output_ip = ':nodeIp'
                AND t.rx_output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE txrs SET halt_comeback = false WHERE id = :appId;`,
    },
    monitor_ip: {
        selectQuery: `
            SELECT
                t.id appId,
                'monitor_ip' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                t.ip nodeIp,
                t.port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM monitor_ips AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.ip = ':nodeIp'
                AND t.port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE monitor_ips SET halt_comeback = false WHERE id = :appId;`,
    },
    encoder: {
        selectQuery: `
            SELECT
                t.id appId,
                'encoder' appType,
                t.name appName,

                n.id nodeId,
                n.name nodeName,
                ':nodeIp' nodeIp,
                :nodePort nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,

                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM encoders AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.source LIKE '%:nodeIp::nodePort'
            LIMIT 1;
        `,
        updateQuery: `UPDATE encoders SET halt_comeback = false WHERE id = :appId;`,
    },
    sdi_player: {
        selectQuery: `
            SELECT
                t.id appId,
                'sdi_player' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                ':nodeIp' nodeIp,
                :nodePort nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM sdi_players AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE (t.status = 'active' OR t.status = 'error')
                AND t.id = :appId
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.source LIKE '%:nodeIp::nodePort%'
            LIMIT 1;
        `,
        updateQuery: `UPDATE sdi_players SET halt_comeback = false WHERE id = :appId;`,
    },
    transcoder: {
        selectQuery: `
            SELECT
                t.id appId,
                'transcoder' appType,
                t.name appName,
    
                n.id nodeId,
                n.name nodeName,
                ':nodeIp' nodeIp,
                :nodePort nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,
    
                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM transcoders AS t
                LEFT JOIN nodes n ON t.node_id = n.id
            WHERE t.id = :appId
                AND (t.status = 'active' OR t.status = 'error')
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND t.node_id = :nodeId
                AND t.udp_ip = ':nodeIp'
                AND t.udp_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE transcoders SET halt_comeback = false WHERE id = :appId;`,
    },
    ipbe: {
        selectQuery: `
            SELECT
                t.id appId,
                'ipbe' appType,
                t.name appName,

                n.id nodeId,
                n.name nodeName,
                ipd.output_ip nodeIp,
                ipd.output_port nodePort,
                TIME_TO_SEC(TIMEDIFF(NOW(), n.last_ping)) > n.offline_time nodeOffline,

                t.company_id companyId,
                t.halt_comeback haltComeback,
                t.halt_until haltUntil
            FROM ipbes AS t
                LEFT JOIN nodes n ON t.node_id = n.id
                LEFT JOIN ipbe_destinations ipd ON t.id = ipd.ipbe_id
            WHERE t.id = :appId
                AND t.node_id = :nodeId
                AND (t.status = 'active' OR t.status = 'error')
                AND (t.ignore_alerts = false OR t.ignore_alerts IS NULL)
                AND (UNIX_TIMESTAMP(t.halt_until) < :lastRuntime OR t.halt_until IS NULL)
                AND ipd.output_ip = ':nodeIp'
                AND ipd.output_port = :nodePort
            LIMIT 1;
        `,
        updateQuery: `UPDATE ipbes SET halt_comeback = false WHERE id = :appId;`,
    },
};
//# sourceMappingURL=sql-queries.js.map