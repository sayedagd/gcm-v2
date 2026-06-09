jest.mock('../../../database', () => ({
    query: jest.fn(),
}));

jest.mock('../../shared/services/metricsService', () => ({
    recordBackupFailure: jest.fn(),
    getMetricsSnapshot: jest.fn(() => ({
        generatedAt: '2026-01-01T00:00:00.000Z',
        metrics: {
            queueDepths: {
                ocr: null,
                backups: null,
                whatsapp: null,
            },
        },
    })),
    setQueueDepth: jest.fn(),
}));

const { query } = require('../../../database');
const metricsService = require('../../shared/services/metricsService');
const systemController = require('../../shared/controllers/systemController');

describe('system controller queue visibility metrics', () => {
    const createRes = () => ({
        json: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('adds queue depth, retry and dead-letter visibility to metrics response', async () => {
        query.mockResolvedValue({
            rows: [
                { queue_name: 'ocr', queued_count: 3, retry_count: 2, dead_letter_count: 1, running_count: 1 },
                { queue_name: 'whatsapp', queued_count: 4, retry_count: 1, dead_letter_count: 2, running_count: 0 },
                { queue_name: 'backups', queued_count: 2, retry_count: 0, dead_letter_count: 1, running_count: 1 },
            ],
        });

        const req = {};
        const res = createRes();

        await systemController.getMetrics(req, res);

        expect(metricsService.setQueueDepth).toHaveBeenCalledWith({ queueName: 'ocr', depth: 6 });
        expect(metricsService.setQueueDepth).toHaveBeenCalledWith({ queueName: 'whatsapp', depth: 5 });
        expect(metricsService.setQueueDepth).toHaveBeenCalledWith({ queueName: 'backups', depth: 3 });

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            metrics: expect.objectContaining({
                queueDepths: expect.objectContaining({
                    ocr: 6,
                    whatsapp: 5,
                    backups: 3,
                }),
            }),
            queueVisibility: expect.objectContaining({
                queues: expect.objectContaining({
                    ocr: expect.objectContaining({ retry: 2, deadLetter: 1 }),
                    whatsapp: expect.objectContaining({ retry: 1, deadLetter: 2 }),
                    backups: expect.objectContaining({ retry: 0, deadLetter: 1 }),
                }),
            }),
        }));
    });
});
