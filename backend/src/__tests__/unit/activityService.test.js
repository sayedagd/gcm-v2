/**
 * GCM ERP - Backend Unit Tests
 * Phase 1.1: Activity Service Tests
 */

const { query } = require('../../../database');
const { logActivity } = require('../../../src/shared/services/activityService');

// Mock database
jest.mock('../../../database');

describe('logActivity()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('inserts audit log with correct entity_type, entity_id, action', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123', 'Via API');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO activity_logs'),
      expect.arrayContaining([
        expect.stringMatching(/^LOG-/), // id
        'CREATE', // action
        'TRIP', // entity_type
        'trip-123', // entity_id
        'Test Trip', // entity_name
        'Via API', // details
        expect.any(String), // timestamp
        'user-123' // user_id
      ])
    );
  });

  test('falls back to SYSTEM user_id if provided user does not exist in DB', async () => {
    // First call: check if user exists (returns empty)
    query.mockResolvedValueOnce({ rows: [] });
    // Second call: check if SYSTEM user exists (returns SYSTEM user)
    query.mockResolvedValueOnce({ rows: [{ id: 'SYSTEM' }] });
    // Third call: insert activity log
    query.mockResolvedValueOnce({ rows: [] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'nonexistent-user', 'Via API');

    expect(query).toHaveBeenCalledTimes(3);
  });

  test('falls back to NULL if SYSTEM user also missing', async () => {
    // First call: check if user exists (returns empty)
    query.mockResolvedValueOnce({ rows: [] });
    // Second call: check if SYSTEM user exists (returns empty)
    query.mockResolvedValueOnce({ rows: [] });
    // Third call: insert activity log with NULL user_id
    query.mockResolvedValueOnce({ rows: [] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'nonexistent-user', 'Via API');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO activity_logs'),
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        null // user_id should be NULL
      ])
    );
  });

  test('does not throw on DB error — fails silently', async () => {
    query.mockRejectedValue(new Error('Database connection failed'));

    // Should not throw
    await expect(
      logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123', 'Via API')
    ).resolves.not.toThrow();

    expect(console.error).toHaveBeenCalledWith(
      '[Activity Log Error]',
      expect.any(String)
    );
  });

  test('generates unique ID for each activity log entry', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123');
    await logActivity('UPDATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123');

    // Get the insert calls (skip the user check calls)
    const insertCalls = query.mock.calls.filter(call => 
      call[0].includes('INSERT INTO activity_logs')
    );

    const firstCallArgs = insertCalls[0][1];
    const secondCallArgs = insertCalls[1][1];

    expect(firstCallArgs[0]).not.toBe(secondCallArgs[0]);
    expect(firstCallArgs[0]).toMatch(/^LOG-\d+-/);
  });

  test('handles all action types (CREATE, UPDATE, DELETE)', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'TRIP', 'trip-1', 'Trip 1', 'user-123');
    await logActivity('UPDATE', 'TRIP', 'trip-1', 'Trip 1', 'user-123');
    await logActivity('DELETE', 'TRIP', 'trip-1', 'Trip 1', 'user-123');

    // Each logActivity call makes 2 query calls (user check + insert)
    expect(query).toHaveBeenCalledTimes(6);

    // Get only the insert calls
    const insertCalls = query.mock.calls.filter(call => 
      call[0].includes('INSERT INTO activity_logs')
    );
    
    expect(insertCalls).toHaveLength(3);
    const actions = insertCalls.map(call => call[1][1]);
    expect(actions).toContain('CREATE');
    expect(actions).toContain('UPDATE');
    expect(actions).toContain('DELETE');
  });

  test('handles different entity types', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'COMPANY', 'comp-1', 'Company 1', 'user-123');
    await logActivity('CREATE', 'PROJECT', 'proj-1', 'Project 1', 'user-123');
    await logActivity('CREATE', 'TRIP', 'trip-1', 'Trip 1', 'user-123');

    const entityTypes = query.mock.calls.map(call => call[1][2]);
    expect(entityTypes).toContain('COMPANY');
    expect(entityTypes).toContain('PROJECT');
    expect(entityTypes).toContain('TRIP');
  });

  test('includes ISO timestamp', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    const beforeDate = new Date();
    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123');
    const afterDate = new Date();

    // Get the insert call (skip the user check call)
    const insertCalls = query.mock.calls.filter(call => 
      call[0].includes('INSERT INTO activity_logs')
    );
    
    const timestampArg = insertCalls[0][1][6];
    
    // The timestamp is stored as an ISO string in the DB
    expect(timestampArg).toBeTruthy();
    expect(typeof timestampArg).toBe('string');
    expect(timestampArg).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    
    const timestamp = new Date(timestampArg);
    expect(timestamp).toBeInstanceOf(Date);
  });

  test('handles empty details parameter', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123', '');

    // Get the insert call
    const insertCalls = query.mock.calls.filter(call => 
      call[0].includes('INSERT INTO activity_logs')
    );

    expect(insertCalls[0][1]).toEqual(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        '', // details should be empty string
        expect.any(String),
        expect.any(String)
      ])
    );
  });

  test('uses provided user_id if user exists in DB', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-123' }] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'user-123', 'Via API');

    // Get the insert call
    const insertCalls = query.mock.calls.filter(call => 
      call[0].includes('INSERT INTO activity_logs')
    );

    expect(insertCalls[0][1]).toEqual(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'user-123' // user_id should be the provided one
      ])
    );
  });

  test('logs warning when falling back to SYSTEM user', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'SYSTEM' }] });
    query.mockResolvedValueOnce({ rows: [] });

    await logActivity('CREATE', 'TRIP', 'trip-123', 'Test Trip', 'nonexistent-user', 'Via API');

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Activity Log]')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent-user')
    );
  });
});