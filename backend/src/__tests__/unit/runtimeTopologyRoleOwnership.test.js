describe('runtime topology role ownership', () => {
    const originalProcessRole = process.env.PROCESS_ROLE;
    const originalEnableInProcessJobs = process.env.ENABLE_IN_PROCESS_JOBS;

    afterEach(() => {
        if (originalProcessRole === undefined) {
            delete process.env.PROCESS_ROLE;
        } else {
            process.env.PROCESS_ROLE = originalProcessRole;
        }

        if (originalEnableInProcessJobs === undefined) {
            delete process.env.ENABLE_IN_PROCESS_JOBS;
        } else {
            process.env.ENABLE_IN_PROCESS_JOBS = originalEnableInProcessJobs;
        }

        jest.resetModules();
    });

    test('api role does not run in-process jobs even when the flag is enabled', () => {
        process.env.PROCESS_ROLE = 'api';
        process.env.ENABLE_IN_PROCESS_JOBS = 'true';

        let app;
        jest.isolateModules(() => {
            app = require('../../../app');
        });

        expect(app._startup.processRole).toBe('api');
        expect(app._startup.enableInProcessJobsRequested).toBe(true);
        expect(app._startup.shouldRunInProcessJobs).toBe(false);
    });

    test('worker role owns in-process background jobs', () => {
        process.env.PROCESS_ROLE = 'worker';
        process.env.ENABLE_IN_PROCESS_JOBS = 'false';

        let app;
        jest.isolateModules(() => {
            app = require('../../../app');
        });

        expect(app._startup.processRole).toBe('worker');
        expect(app._startup.shouldRunInProcessJobs).toBe(true);
    });
});
