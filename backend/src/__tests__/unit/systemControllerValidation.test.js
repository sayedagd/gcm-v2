const systemController = require('../../shared/controllers/systemController');

describe('system controller validation guards', () => {
  const createRes = () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  };

  test('rejects invalid backup format', async () => {
    const req = { query: { format: 'csv' } };
    const res = createRes();

    await systemController.downloadSystemBackup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'fail',
      code: 'INVALID_BACKUP_FORMAT',
    }));
  });

  test('rejects invalid idempotency key format', async () => {
    const req = {
      headers: {
        'x-idempotency-key': 'invalid key with spaces',
        'x-scheduler-source': 'manual',
      },
    };
    const res = createRes();

    await systemController.triggerAutoBackup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'fail',
      code: 'INVALID_IDEMPOTENCY_KEY',
    }));
  });

  test('rejects unsupported restore mime type', async () => {
    const req = {
      file: {
        path: '/tmp/backup.invalid',
        originalname: 'backup.invalid',
        mimetype: 'text/plain',
      },
    };
    const res = createRes();

    await systemController.restoreSystemBackup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'fail',
      code: 'UNSUPPORTED_BACKUP_FILE_TYPE',
    }));
  });
});
