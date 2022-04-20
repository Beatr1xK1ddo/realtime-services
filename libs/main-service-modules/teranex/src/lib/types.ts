import { IClientSubscribeEvent } from '@socket/shared-types';

export const isClientSubscribeEvet = (
    event: IClientSubscribeEvent
): event is IClientSubscribeEvent =>
    typeof event === 'object' &&
    typeof event.nodeId === 'number' &&
    typeof event.ip === 'string' &&
    typeof event.port === 'number';
