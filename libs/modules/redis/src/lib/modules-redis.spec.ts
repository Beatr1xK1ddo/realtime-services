import { modulesRedis } from './modules-redis';

describe('modulesRedis', () => {
    it('should work', () => {
        expect(modulesRedis()).toEqual('modules-redis');
    });
});
