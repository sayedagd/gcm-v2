/**
 * =====================================================
 * BATCH 1D — Exhaustive Tests for accountant_utils.ts
 * Target: 100% Statement, Branch, Path Coverage
 * Functions: normalizeToTons (private but tested via calculateAccountantStats),
 *            calculateAccountantStats
 * =====================================================
 */

import { describe, it, expect } from 'vitest';
import { calculateAccountantStats } from '@/utils/accountant_utils';
import type { Trip, Project, Company, Service } from '@/types';

// =====================================================
// Factory helpers for concise test data
// =====================================================
const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
    trip_id: 'T-1',
    company_id: 'C1',
    project_id: 'P1',
    service_id: 'S1',
    date: '2024-06-15',
    time: '10:00',
    quantity: '10',
    unit: 'TON',
    vehicle_id: 'V1',
    driver_id: 'D1',
    status: 'COMPLETED',
    notes: '',
    ...overrides
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    project_id: 'P1',
    project_name: 'Test Project',
    company_id: 'C1',
    ...overrides
} as Project);

const makeCompany = (overrides: Partial<Company> = {}): Company => ({
    company_id: 'C1',
    company_name: 'Test Company',
    commercial_reg: '123',
    ...overrides
} as Company);

const makeService = (overrides: Partial<Service> = {}): Service => ({
    service_id: 'S1',
    service_name: 'Waste Collection',
    ...overrides
} as Service);

const defaultFilters = {
    searchTerm: '',
    dateRange: { start: '', end: '' },
    selectedStatus: 'ALL',
    selectedService: 'ALL'
};

// =====================================================
// calculateAccountantStats
// =====================================================
describe('calculateAccountantStats', () => {
    // -----------------------------------------------
    // Empty / minimal inputs
    // -----------------------------------------------
    describe('empty inputs', () => {
        it('returns empty array for no trips', () => {
            const result = calculateAccountantStats(
                [], [makeProject()], [makeCompany()], [makeService()], defaultFilters
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for no companies', () => {
            const result = calculateAccountantStats(
                [makeTrip()], [makeProject()], [], [makeService()], defaultFilters
            );
            // Trip's project has company_id 'C1' but no company bucket exists
            // → falls to UNKNOWN_COMPANY bucket; still has 1 trip
            expect(result.length).toBe(1);
            expect((result[0] as any).info.company_name).toBe('Unknown Company');
        });
    });

    // -----------------------------------------------
    // normalizeToTons — tested via cost calculation
    // The default unit price is 100 SAR/ton
    // -----------------------------------------------
    describe('unit normalization (via cost calculation)', () => {
        it('TON: qty passes through (10 TON = 1000 SAR)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '10', unit: 'TON' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(1000); // 10 * 100
        });

        it('KG: qty divided by 1000 (5000 KG = 5 TON = 500 SAR)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '5000', unit: 'KG' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(500);
        });

        it('KILOGRAM: same as KG (2000 KILOGRAM = 2 TON = 200 SAR)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '2000', unit: 'KILOGRAM' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(200);
        });

        it('G: qty divided by 1,000,000 (1000000 G = 1 TON = 100 SAR)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '1000000', unit: 'G' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(100);
        });

        it('GRAM: same as G', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '2000000', unit: 'GRAM' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(200);
        });

        it('Unknown unit: qty passes through as-is (like TON)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '5', unit: 'BARREL' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(500);
        });

        it('Zero quantity: normalizeToTons returns 0 → cost = 0', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '0', unit: 'TON' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(0);
        });

        it('Empty quantity string: parsed as 0', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '' as any, unit: 'TON' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(0);
        });

        it('Non-numeric quantity: parseFloat → NaN → 0', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: 'abc' as any, unit: 'TON' })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalSpent).toBe(0);
        });
    });

    // -----------------------------------------------
    // Date range filtering
    // -----------------------------------------------
    describe('date range filtering', () => {
        it('excludes trips before start date', () => {
            const result = calculateAccountantStats(
                [makeTrip({ date: '2024-01-01' })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, dateRange: { start: '2024-06-01', end: '' } }
            );
            expect(result).toEqual([]);
        });

        it('excludes trips after end date', () => {
            const result = calculateAccountantStats(
                [makeTrip({ date: '2024-12-31' })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, dateRange: { start: '', end: '2024-06-30' } }
            );
            expect(result).toEqual([]);
        });

        it('includes trips within date range', () => {
            const result = calculateAccountantStats(
                [makeTrip({ date: '2024-06-15' })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, dateRange: { start: '2024-06-01', end: '2024-06-30' } }
            );
            expect(result.length).toBe(1);
        });

        it('does not filter when date range is empty', () => {
            const result = calculateAccountantStats(
                [makeTrip({ date: '2020-01-01' })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, dateRange: { start: '', end: '' } }
            );
            expect(result.length).toBe(1);
        });
    });

    // -----------------------------------------------
    // Status filtering
    // -----------------------------------------------
    describe('status filtering', () => {
        it('includes all statuses when selectedStatus is "ALL"', () => {
            const result = calculateAccountantStats(
                [makeTrip({ status: 'IN_PROGRESS' as any }), makeTrip({ trip_id: 'T-2', status: 'COMPLETED' as any })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, selectedStatus: 'ALL' }
            );
            expect((result[0] as any).totalTrips).toBe(2);
        });

        it('excludes trips with non-matching status', () => {
            const result = calculateAccountantStats(
                [makeTrip({ status: 'IN_PROGRESS' as any })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, selectedStatus: 'COMPLETED' }
            );
            expect(result).toEqual([]);
        });

        it('includes only trips matching the selected status', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', status: 'COMPLETED' as any, quantity: '10' }),
                    makeTrip({ trip_id: 'T-2', status: 'IN_PROGRESS' as any, quantity: '5' })
                ],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, selectedStatus: 'COMPLETED' }
            );
            expect((result[0] as any).totalTrips).toBe(1);
            expect((result[0] as any).totalQty).toBe(10);
        });
    });

    // -----------------------------------------------
    // Service filtering
    // -----------------------------------------------
    describe('service filtering', () => {
        it('includes all services when selectedService is "ALL"', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', service_id: 'S1' }),
                    makeTrip({ trip_id: 'T-2', service_id: 'S2' })
                ],
                [makeProject()], [makeCompany()],
                [makeService(), makeService({ service_id: 'S2', service_name: 'Recycling' })],
                { ...defaultFilters, selectedService: 'ALL' }
            );
            expect((result[0] as any).totalTrips).toBe(2);
        });

        it('excludes trips with non-matching service', () => {
            const result = calculateAccountantStats(
                [makeTrip({ service_id: 'S2' })],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, selectedService: 'S1' }
            );
            expect(result).toEqual([]);
        });
    });

    // -----------------------------------------------
    // Project → Company mapping
    // -----------------------------------------------
    describe('project-company bucketing', () => {
        it('maps trip to correct company via project', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: 'P1', quantity: '10' })],
                [makeProject({ project_id: 'P1', company_id: 'C1' })],
                [makeCompany({ company_id: 'C1', company_name: 'NEOM' })],
                [makeService()],
                defaultFilters
            );
            expect(result.length).toBe(1);
            expect((result[0] as any).info.company_name).toBe('NEOM');
            expect((result[0] as any).totalQty).toBe(10);
        });

        it('creates UNKNOWN_COMPANY bucket when project has no matching company', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: 'P1' })],
                [makeProject({ project_id: 'P1', company_id: 'C_MISSING' })],
                [makeCompany({ company_id: 'C1' })], // C_MISSING not in companies
                [makeService()],
                defaultFilters
            );
            expect(result.length).toBe(1);
            expect((result[0] as any).info.company_name).toBe('Unknown Company');
        });

        it('creates UNKNOWN_COMPANY bucket when no project matches', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: 'P_NONEXISTENT' })],
                [makeProject({ project_id: 'P1' })], // P_NONEXISTENT not found
                [makeCompany()],
                [makeService()],
                defaultFilters
            );
            expect(result.length).toBe(1);
            expect((result[0] as any).info.company_id).toBe('UNKNOWN_COMPANY');
        });

        it('creates fallback project info when project is null', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: 'P_X' })],
                [], // no projects at all
                [makeCompany()],
                [makeService()],
                defaultFilters
            );
            expect(result.length).toBe(1);
            const projects = (result[0] as any).projects;
            const projKeys = Object.keys(projects);
            expect(projKeys).toContain('P_X');
            expect(projects['P_X'].info.project_name).toContain('P_X');
        });
    });

    // -----------------------------------------------
    // Service bucketing within projects
    // -----------------------------------------------
    describe('service bucketing', () => {
        it('creates a known service bucket when service exists', () => {
            const result = calculateAccountantStats(
                [makeTrip({ service_id: 'S1', quantity: '5' })],
                [makeProject()], [makeCompany()],
                [makeService({ service_id: 'S1', service_name: 'Waste' })],
                defaultFilters
            );
            const projRef = (result[0] as any).projects['P1'];
            expect(projRef.services['S1'].info.service_name).toBe('Waste');
            expect(projRef.services['S1'].qty).toBe(5);
            expect(projRef.services['S1'].trips).toBe(1);
        });

        it('creates a fallback service bucket for unknown service_id', () => {
            const result = calculateAccountantStats(
                [makeTrip({ service_id: 'S_UNKNOWN' })],
                [makeProject()], [makeCompany()],
                [makeService({ service_id: 'S1' })], // S_UNKNOWN not in list
                defaultFilters
            );
            const projRef = (result[0] as any).projects['P1'];
            expect(projRef.services['S_UNKNOWN']).toBeDefined();
            expect(projRef.services['S_UNKNOWN'].info.service_name).toContain('S_UNKNOWN');
        });

        it('handles trip with no service_id → uses UNKNOWN_SERVICE', () => {
            const result = calculateAccountantStats(
                [makeTrip({ service_id: undefined as any })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            const projRef = (result[0] as any).projects['P1'];
            expect(projRef.services['UNKNOWN_SERVICE']).toBeDefined();
        });
    });

    // -----------------------------------------------
    // Multi-company, multi-project aggregation
    // -----------------------------------------------
    describe('multi-entity aggregation', () => {
        it('separates stats across multiple companies', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', project_id: 'P1', quantity: '10' }),
                    makeTrip({ trip_id: 'T-2', project_id: 'P2', quantity: '20' })
                ],
                [
                    makeProject({ project_id: 'P1', company_id: 'C1' }),
                    makeProject({ project_id: 'P2', company_id: 'C2' })
                ],
                [
                    makeCompany({ company_id: 'C1', company_name: 'Alpha' }),
                    makeCompany({ company_id: 'C2', company_name: 'Beta' })
                ],
                [makeService()],
                defaultFilters
            );
            expect(result.length).toBe(2);
            const alpha = result.find((c: any) => c.info.company_name === 'Alpha') as any;
            const beta = result.find((c: any) => c.info.company_name === 'Beta') as any;
            expect(alpha.totalQty).toBe(10);
            expect(beta.totalQty).toBe(20);
        });

        it('aggregates multiple trips into the same project', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', quantity: '10' }),
                    makeTrip({ trip_id: 'T-2', quantity: '15' })
                ],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            expect((result[0] as any).totalTrips).toBe(2);
            expect((result[0] as any).totalQty).toBe(25);
        });
    });

    // -----------------------------------------------
    // Search term filtering
    // -----------------------------------------------
    describe('search term filtering', () => {
        it('filters by company name (case insensitive)', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', project_id: 'P1' }),
                    makeTrip({ trip_id: 'T-2', project_id: 'P2' })
                ],
                [
                    makeProject({ project_id: 'P1', company_id: 'C1' }),
                    makeProject({ project_id: 'P2', company_id: 'C2' })
                ],
                [
                    makeCompany({ company_id: 'C1', company_name: 'NEOM Group' }),
                    makeCompany({ company_id: 'C2', company_name: 'Red Sea' })
                ],
                [makeService()],
                { ...defaultFilters, searchTerm: 'neom' }
            );
            expect(result.length).toBe(1);
            expect((result[0] as any).info.company_name).toBe('NEOM Group');
        });

        it('filters by project name (case insensitive)', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: 'P1' })],
                [makeProject({ project_id: 'P1', project_name: 'The Line Sector 1' })],
                [makeCompany()],
                [makeService()],
                { ...defaultFilters, searchTerm: 'line' }
            );
            expect(result.length).toBe(1);
        });

        it('returns empty when search matches nothing', () => {
            const result = calculateAccountantStats(
                [makeTrip()],
                [makeProject()],
                [makeCompany({ company_name: 'Alpha' })],
                [makeService()],
                { ...defaultFilters, searchTerm: 'zzz_nonexistent' }
            );
            expect(result).toEqual([]);
        });

        it('returns all results when searchTerm is empty', () => {
            const result = calculateAccountantStats(
                [makeTrip()],
                [makeProject()], [makeCompany()], [makeService()],
                { ...defaultFilters, searchTerm: '' }
            );
            expect(result.length).toBe(1);
        });
    });

    // -----------------------------------------------
    // Edge cases / boundaries
    // -----------------------------------------------
    describe('edge cases', () => {
        it('filters out companies with 0 trips (no data after filtering)', () => {
            const result = calculateAccountantStats(
                [], // no trips
                [makeProject()],
                [makeCompany()],
                [makeService()],
                defaultFilters
            );
            // Company bucket exists but has 0 trips → filtered out
            expect(result.length).toBe(0);
        });

        it('handles trip with undefined project_id', () => {
            const result = calculateAccountantStats(
                [makeTrip({ project_id: undefined as any })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            // Falls to UNKNOWN_COMPANY with project_id = 'UNKNOWN_PROJECT'
            expect(result.length).toBe(1);
        });

        it('handles trip with undefined unit → default TON passthrough', () => {
            const result = calculateAccountantStats(
                [makeTrip({ quantity: '10', unit: undefined as any })],
                [makeProject()], [makeCompany()], [makeService()],
                defaultFilters
            );
            // normalizeToTons defaults unit to TON → 10 * 100 = 1000
            expect((result[0] as any).totalSpent).toBe(1000);
        });

        it('accumulates cost correctly across multiple services in same project', () => {
            const result = calculateAccountantStats(
                [
                    makeTrip({ trip_id: 'T-1', service_id: 'S1', quantity: '10' }),
                    makeTrip({ trip_id: 'T-2', service_id: 'S2', quantity: '5' })
                ],
                [makeProject()],
                [makeCompany()],
                [makeService(), makeService({ service_id: 'S2', service_name: 'Recycling' })],
                defaultFilters
            );
            const proj = (result[0] as any).projects['P1'];
            expect(proj.services['S1'].qty).toBe(10);
            expect(proj.services['S2'].qty).toBe(5);
            expect(proj.totalQty).toBe(15);
            expect(proj.totalTrips).toBe(2);
            expect((result[0] as any).totalSpent).toBe(1500); // (10+5) * 100
        });
    });
});
