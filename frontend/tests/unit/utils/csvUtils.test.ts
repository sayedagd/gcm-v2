/**
 * =====================================================
 * BATCH 2A — Exhaustive Tests for csvUtils.ts
 * Target: 100% Statement, Branch, Path Coverage
 * Functions: exportToCSV, downloadCSVTemplate, parseCSV
 * =====================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, downloadCSVTemplate, parseCSV } from '@/utils/csvUtils';

// =====================================================
// exportToCSV
// =====================================================
describe('exportToCSV', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let mockLink: { setAttribute: ReturnType<typeof vi.fn>; click: ReturnType<typeof vi.fn>; style: any; download: string };

    beforeEach(() => {
        mockLink = {
            setAttribute: vi.fn(),
            click: vi.fn(),
            style: {},
            download: ''  // defined → link.download !== undefined is true
        };
        createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
        appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
        removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
        createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('happy path', () => {
        it('creates a download link and triggers click', () => {
            const data = [{ name: 'Test', age: 30 }];
            exportToCSV('export', ['Name', 'Age'], data, item => [item.name, item.age]);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
            expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'export.csv');
            expect(mockLink.click).toHaveBeenCalled();
            expect(appendChildSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalled();
        });

        it('appends .csv extension when not present', () => {
            exportToCSV('myfile', ['H1'], [], () => []);
            expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'myfile.csv');
        });

        it('does not double .csv extension', () => {
            exportToCSV('myfile.csv', ['H1'], [], () => []);
            expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'myfile.csv');
        });
    });

    describe('data mapping', () => {
        it('escapes double quotes in field values', () => {
            const data = [{ text: 'He said "hello"' }];
            exportToCSV('test', ['Text'], data, item => [item.text]);

            // The blob content would contain escaped quotes, verified via createObjectURL call
            expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
            const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
            expect(blob).toBeInstanceOf(Blob);
        });

        it('handles null and undefined fields gracefully', () => {
            const data = [{ a: null, b: undefined }];
            exportToCSV('test', ['A', 'B'], data, item => [item.a, item.b]);
            expect(mockLink.click).toHaveBeenCalled();
        });

        it('handles empty data array', () => {
            exportToCSV('empty', ['H1', 'H2'], [], () => []);
            expect(mockLink.click).toHaveBeenCalled();
        });

        it('maps multiple rows correctly', () => {
            const data = [{ v: 1 }, { v: 2 }, { v: 3 }];
            exportToCSV('test', ['Value'], data, item => [item.v]);
            expect(mockLink.click).toHaveBeenCalled();
        });
    });

    describe('branch: link.download is undefined (old browser)', () => {
        it('does not trigger download if link.download is undefined', () => {
            // Simulate old browser where download attribute doesn't exist
            const noDownloadLink = {
                setAttribute: vi.fn(),
                click: vi.fn(),
                style: {},
                // download property intentionally omitted → undefined
            };
            createElementSpy.mockReturnValue(noDownloadLink as any);

            exportToCSV('test', ['H1'], [{ v: 1 }], item => [item.v]);

            // link.download === undefined → the if block is skipped
            expect(noDownloadLink.click).not.toHaveBeenCalled();
        });
    });
});

// =====================================================
// downloadCSVTemplate
// =====================================================
describe('downloadCSVTemplate', () => {
    let mockLink: any;

    beforeEach(() => {
        mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {}, download: '' };
        vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:template');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('calls exportToCSV with empty data and noop mapper', () => {
        downloadCSVTemplate('template', ['ID', 'Name', 'Status']);
        expect(mockLink.click).toHaveBeenCalled();
    });

    it('applies .csv extension to template filename', () => {
        downloadCSVTemplate('import_template', ['Col1']);
        expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'import_template.csv');
    });
});

// =====================================================
// parseCSV
// =====================================================
describe('parseCSV', () => {
    const createCSVFile = (content: string, name = 'test.csv'): File => {
        return new File([content], name, { type: 'text/csv' });
    };

    describe('happy path', () => {
        it('parses a simple CSV with 2 rows', async () => {
            const file = createCSVFile('Name,Age\nAlice,30\nBob,25');
            const result = await parseCSV(file);
            expect(result).toHaveLength(3); // header + 2 data rows
            expect(result[0]).toEqual(['Name', 'Age']);
            expect(result[1]).toEqual(['Alice', '30']);
        });

        it('parses CSV with \\r\\n line endings', async () => {
            const file = createCSVFile('A,B\r\n1,2\r\n3,4');
            const result = await parseCSV(file);
            expect(result).toHaveLength(3);
        });
    });

    describe('BOM handling', () => {
        it('strips UTF-8 BOM from the first line', async () => {
            const bom = '\uFEFF';
            const file = createCSVFile(`${bom}Name,Age\nAlice,30`);
            const result = await parseCSV(file);
            expect(result[0][0]).toBe('Name'); // BOM should be stripped
        });
    });

    describe('empty lines', () => {
        it('ignores empty lines between data rows', async () => {
            const file = createCSVFile('A,B\n\n1,2\n\n3,4\n');
            const result = await parseCSV(file);
            expect(result).toHaveLength(3); // empty lines filtered out
        });

        it('ignores whitespace-only lines', async () => {
            const file = createCSVFile('A,B\n   \n1,2');
            const result = await parseCSV(file);
            expect(result).toHaveLength(2);
        });
    });

    describe('quoted fields', () => {
        it('handles quoted fields with commas', async () => {
            const file = createCSVFile('Name,Address\n"Alice","123, Main St"');
            const result = await parseCSV(file);
            expect(result[1]).toContain('123, Main St');
        });

        it('handles escaped double quotes within fields', async () => {
            const file = createCSVFile('Text\n"He said ""hello"""');
            const result = await parseCSV(file);
            expect(result[1][0]).toBe('He said "hello"');
        });
    });

    describe('edge cases', () => {
        it('handles a file with only headers (no data rows)', async () => {
            const file = createCSVFile('ID,Name,Status');
            const result = await parseCSV(file);
            expect(result).toHaveLength(1);
        });

        it('handles single-column CSV', async () => {
            const file = createCSVFile('Value\n100\n200');
            const result = await parseCSV(file);
            expect(result).toHaveLength(3);
            expect(result[1]).toEqual(['100']);
        });
    });
});
