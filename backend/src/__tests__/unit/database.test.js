/**
 * GCM ERP - Backend Unit Tests
 * Phase 1.1: Database Module Tests
 */

const { Pool } = require('pg');

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    on: jest.fn(),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  logEvent: jest.fn(),
}));

describe('database.js', () => {
  let database;
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset modules
    jest.resetModules();
    
    // Get fresh mock
    const { Pool } = require('pg');
    mockPool = new Pool();
    mockPool.connect.mockResolvedValue({
      release: jest.fn()
    });
    
    // Load database module after mocking
    database = require('../../../database');
  });

  describe('connectWithRetry', () => {
    test('waitForDb() attempts to connect and resolves when successful', async () => {
      const result = await database.waitForDb();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('query() logs slow queries when execution > 200ms', async () => {
      const mockQuery = 'SELECT * FROM companies';
      const mockParams = [];
      const { logEvent } = require('../../../src/shared/utils/logger');
      
      // Mock slow query
      mockPool.query.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
        return { rows: [] };
      });

      await database.query(mockQuery, mockParams);

      expect(logEvent).toHaveBeenCalledWith(
        'db_slow_query',
        expect.objectContaining({
          queryFingerprint: expect.any(String),
          thresholdMs: 200,
        })
      );
    });

    test('initializePool() uses DATABASE_URL if present in env', () => {
      process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
      
      jest.isolateModules(() => {
        require('../../../database');
      });

      const { Pool } = require('pg');

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgres://test:test@localhost:5432/test'
        })
      );

      delete process.env.DATABASE_URL;
    });

    test('initializePool() falls back to individual PROD_DB_* vars if no DATABASE_URL', () => {
      delete process.env.DATABASE_URL;
      process.env.PROD_DB_USER = 'testuser';
      process.env.PROD_DB_HOST = 'testhost';
      process.env.PROD_DB_NAME = 'testdb';
      process.env.PROD_DB_PASS = 'testpass';
      process.env.PROD_DB_PORT = '5432';

      jest.isolateModules(() => {
        require('../../../database');
      });

      const { Pool } = require('pg');

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'testuser',
          host: 'testhost',
          database: 'testdb',
          password: 'testpass',
          port: '5432'
        })
      );

      // Cleanup
      delete process.env.PROD_DB_USER;
      delete process.env.PROD_DB_HOST;
      delete process.env.PROD_DB_NAME;
      delete process.env.PROD_DB_PASS;
      delete process.env.PROD_DB_PORT;
    });

    test('Pool config sets max: 50, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000', () => {
      process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

      jest.isolateModules(() => {
        require('../../../database');
      });

      const { Pool } = require('pg');

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 50,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000
        })
      );

      delete process.env.DATABASE_URL;
    });
  });

  describe('waitForDb()', () => {
    test('resolves after connection established', async () => {
      mockPool.connect.mockResolvedValue({
        release: jest.fn()
      });

      jest.isolateModules(() => {
        const db = require('../../../database');
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await database.waitForDb();
      expect(result).toBe(true);
    });
  });

  describe('query()', () => {
    test('executes SQL query and returns results', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }] };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await database.query('SELECT * FROM test');
      
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(result.rows).toEqual(mockResult.rows);
    });

    test('handles query parameters correctly', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockPool.query.mockResolvedValue(mockResult);

      await database.query('SELECT * FROM test WHERE id = $1', [1]);
      
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
    });

    test('throws error on query failure', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      await expect(database.query('SELECT * FROM test')).rejects.toThrow('Query failed');
    });
  });

  describe('transaction()', () => {
    test('executes queries in a transaction and commits on success', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn(async (client) => {
        await client.query('INSERT INTO test VALUES (1)');
        return { success: true };
      });

      const result = await database.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('rolls back transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn(async (client) => {
        await client.query('INSERT INTO test VALUES (1)');
        throw new Error('Transaction failed');
      });

      await expect(database.transaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('releases client even if rollback fails', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockRejectedValue(new Error('Rollback failed'));

      const callback = jest.fn(async () => {
        throw new Error('Transaction failed');
      });

      await expect(database.transaction(callback)).rejects.toThrow();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});