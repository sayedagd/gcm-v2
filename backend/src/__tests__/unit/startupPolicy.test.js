const app = require('../../../app');

describe('startup module policy', () => {
    test('marks core modules as critical', () => {
        expect(app._startup.policy.critical.has('database')).toBe(true);
        expect(app._startup.policy.critical.has('login')).toBe(true);
    });

    test('throws when a critical module cannot be loaded', () => {
        expect(() => {
            app._startup.requireByStartupPolicy('./src/does-not-exist.module', 'database');
        }).toThrow(/Critical module "database" failed to load/);
    });

    test('returns fallback router for optional module load failure', () => {
        const fallbackRouter = app._startup.requireByStartupPolicy('./src/does-not-exist.optional', 'shadi');

        expect(typeof fallbackRouter).toBe('function');
    });
});
