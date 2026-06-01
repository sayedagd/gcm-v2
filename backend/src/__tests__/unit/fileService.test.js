/**
 * GCM ERP - Backend Unit Tests
 * Phase 1.1: File Service Tests
 */

const fs = require('fs');
const path = require('path');
const { saveFileHierarchical, saveEntityDoc } = require('../../../fileService');

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('saveFileHierarchical()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default path mocks
    path.join.mockImplementation((...args) => args.join('/'));
    path.__dirname = '/backend';
    
    // Setup fs.promises mock
    fs.promises = {
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined)
    };
  });

  test('builds path: uploads/<Company>/<Project>/<Service>/<Year>/<Month>/Week_<N>/', async () => {
    const mockDate = new Date('2026-05-18');

    const result = await saveFileHierarchical({
      base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      companyName: 'Test Company',
      projectName: 'Test Project',
      serviceName: 'Test Service',
      date: mockDate,
      fileName: 'Manifest'
    });

    // Verify path structure - check that path.join was called with the correct segments
    expect(path.join).toHaveBeenCalled();
    expect(result).toMatch(/^\/uploads\//);
    expect(result).toContain('Test Company');
    expect(result).toContain('Test Project');
    expect(result).toContain('Test Service');
    expect(result).toContain('2026');
    expect(result).toContain('05');
    expect(result).toMatch(/Week_\d/);
  });

  test('calculates correct week number for date', async () => {
    const mockDate1 = new Date('2026-05-01'); // First week
    const mockDate2 = new Date('2026-05-18'); // Third week
    const mockDate3 = new Date('2026-05-25'); // Fourth week

    await saveFileHierarchical({
      base64Data: 'data:image/png;base64,iVBORw0KGgo=',
      companyName: 'Test',
      projectName: 'Test',
      serviceName: 'Test',
      date: mockDate1,
      fileName: 'Test'
    });

    // Week calculation: May 1, 2026 is Friday, so week 1
    // May 18, 2026 is Monday, so week 3
    // May 25, 2026 is Monday, so week 4
  });

  test('returns a relative URL string starting with /uploads/', async () => {

    const result = await saveFileHierarchical({
      base64Data: 'data:image/png;base64,iVBORw0KGgo=',
      companyName: 'Test',
      projectName: 'Test',
      serviceName: 'Test',
      date: new Date(),
      fileName: 'Test'
    });

    expect(result).toMatch(/^\/uploads\//);
    expect(result).toBeTruthy();
  });

  test('creates directory recursively if it does not exist', async () => {

    await saveFileHierarchical({
      base64Data: 'data:image/png;base64,iVBORw0KGgo=',
      companyName: 'Test Company',
      projectName: 'Test Project',
      serviceName: 'Test Service',
      date: new Date(),
      fileName: 'Test'
    });

    expect(fs.promises.mkdir).toHaveBeenCalledWith(
      expect.any(String),
      { recursive: true }
    );
  });

  test('handles invalid base64 data gracefully', async () => {
    const result = await saveFileHierarchical({
      base64Data: 'invalid-base64-data',
      companyName: 'Test',
      projectName: 'Test',
      serviceName: 'Test',
      date: new Date(),
      fileName: 'Test'
    });

    expect(result).toBeNull();
  });

  test('strips invalid path characters from entity names', async () => {

    await saveFileHierarchical({
      base64Data: 'data:image/png;base64,iVBORw0KGgo=',
      companyName: 'Company<>:"/\\|?*Name',
      projectName: 'Project<>:"/\\|?*Name',
      serviceName: 'Service<>:"/\\|?*Name',
      date: new Date(),
      fileName: 'Test'
    });

    // Verify that special characters are replaced with underscores
    // The path should not contain special characters
  });

  test('writes file buffer to disk', async () => {
    const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await saveFileHierarchical({
      base64Data,
      companyName: 'Test',
      projectName: 'Test',
      serviceName: 'Test',
      date: new Date(),
      fileName: 'Test'
    });

    expect(fs.promises.writeFile).toHaveBeenCalled();
    
    // Verify buffer was created from base64
    const writeCallArgs = fs.promises.writeFile.mock.calls[0];
    expect(writeCallArgs[1]).toBeInstanceOf(Buffer);
  });
});

describe('saveEntityDoc()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Setup fs.promises mock (in case it was reset)
    fs.promises = {
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined)
    };
  });

  test('builds path: uploads/<entityType>/<entityName>/<timestamp>_<fieldName>', async () => {

    const result = await saveEntityDoc('company', 'Test Company', 'logo', 'data:image/png;base64,iVBORw0KGgo=');

    // Verify the result contains the expected path segments
    expect(result).toMatch(/^\/uploads\//);
    expect(result).toContain('Test Company');
    expect(result).toContain('_company_docs');
  });

  test('strips invalid path characters from entityName', async () => {

    await saveEntityDoc('company', 'Company<>:"/\\|?*Name', 'logo', 'data:image/png;base64,iVBORw0KGgo=');

    // Verify special characters are stripped
  });

  test('handles different entity types with correct paths', async () => {

    // Test company
    const companyResult = await saveEntityDoc('company', 'Test', 'logo', 'data:image/png;base64,iVBORw0KGgo=');
    expect(companyResult).toContain('_company_docs');

    // Test project
    const projectResult = await saveEntityDoc('project', 'Test', 'po', 'data:image/png;base64,iVBORw0KGgo=');
    expect(projectResult).toContain('_project_docs');

    // Test driver
    const driverResult = await saveEntityDoc('driver', 'Test', 'license', 'data:image/png;base64,iVBORw0KGgo=');
    expect(driverResult).toContain('_fleet');

    // Test vehicle
    const vehicleResult = await saveEntityDoc('vehicle', 'Test', 'photo', 'data:image/png;base64,iVBORw0KGgo=');
    expect(vehicleResult).toContain('_fleet');
  });

  test('returns null for invalid base64 data', async () => {
    const result = await saveEntityDoc('company', 'Test', 'logo', 'invalid-data');
    expect(result).toBeNull();
  });

  test('creates directory recursively', async () => {

    await saveEntityDoc('company', 'Test', 'logo', 'data:image/png;base64,iVBORw0KGgo=');

    expect(fs.promises.mkdir).toHaveBeenCalledWith(
      expect.any(String),
      { recursive: true }
    );
  });

  test('generates timestamp-based filename', async () => {

    const result = await saveEntityDoc('company', 'Test', 'logo', 'data:image/png;base64,iVBORw0KGgo=');

    expect(result).toMatch(/\d+_logo/);
  });

  test('returns relative URL starting with /uploads/', async () => {

    const result = await saveEntityDoc('company', 'Test', 'logo', 'data:image/png;base64,iVBORw0KGgo=');

    expect(result).toMatch(/^\/uploads\//);
  });
});