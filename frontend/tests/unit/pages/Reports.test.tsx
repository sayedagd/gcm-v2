import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '@/pages/Reports';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { Role, TripStatus } from '@/types';

vi.mock('@/context');
vi.mock('@/hooks/useTranslation');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return {
    Building2: MockIcon, MapPin: MockIcon, ArrowRight: MockIcon, UserCheck: MockIcon,
    Truck: MockIcon, HardHat: MockIcon, Activity: MockIcon, FileText: MockIcon,
    FileCheck: MockIcon, Recycle: MockIcon, Package: MockIcon, Navigation: MockIcon,
    AlertCircle: MockIcon, Upload: MockIcon, Wand2: MockIcon, X: MockIcon, CheckCircle2: MockIcon,
    ChevronDown: MockIcon, Image: MockIcon, FileIcon: MockIcon, Trash2: MockIcon,
    Briefcase: MockIcon, Filter: MockIcon, FileDown: MockIcon, Eye: MockIcon, DownloadCloud: MockIcon,
    Edit2: MockIcon, Plus: MockIcon, Search: MockIcon, Calendar: MockIcon, Settings: MockIcon, 
    Menu: MockIcon, Bell: MockIcon, ChevronLeft: MockIcon, ChevronRight: MockIcon, 
    ChevronUp: MockIcon, Download: MockIcon, Check: MockIcon, Circle: MockIcon, Loader2: MockIcon,
    LayoutGrid: MockIcon, List: MockIcon, Zap: MockIcon, ShieldCheck: MockIcon, DollarSign: MockIcon,
    HelpCircle: MockIcon, User: MockIcon, Key: MockIcon, Clock: MockIcon, Edit3: MockIcon,
    Shield: MockIcon, Map: MockIcon, ShieldAlert: MockIcon, PlusCircle: MockIcon, LogIn: MockIcon,
    LogOut: MockIcon, Database: MockIcon, ScrollText: MockIcon, Info: MockIcon, Camera: MockIcon,
    Home: MockIcon, Globe: MockIcon, UserPlus: MockIcon, Save: MockIcon, BarChart2: MockIcon,
    PieChart: MockIcon, TrendingUp: MockIcon, FileSpreadsheet: MockIcon, Wrench: MockIcon,
    Mail: MockIcon
  };
});

vi.mock('date-fns', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        // Mocking dates might be complex, we will just use real date-fns, no need to mock it unless it causes hydration issues.
    };
});

// Mock charting components heavily to avoid rendering errors
vi.mock('@/components', async (importOriginal) => {
    return {
        ReportsFilters: ({ isRestricted, trips }: any) => <div data-testid="mock-filters" data-restricted={isRestricted} data-tripsz={trips.length}>Filters</div>,
        ReportsStats: () => <div data-testid="mock-stats" />,
        LogisticsMap: () => <div data-testid="mock-map" />,
        PeakHoursChart: () => <div data-testid="mock-peak-hours" />,
        ServiceMixChart: () => <div data-testid="mock-service-mix" />,
        VolumeTrendChart: () => <div data-testid="mock-volume-trend" />,
        TopDriversList: () => <div data-testid="mock-top-drivers" />,
        DrilldownSelection: () => <div data-testid="mock-drilldown" />,
        StatusDistributionChart: () => <div data-testid="mock-status-dist" />,
        TopProjectsChart: () => <div data-testid="mock-top-projects" />,
        MonthlyTonnageChart: () => <div data-testid="mock-monthly-tonnage" />,
        VehicleUtilizationChart: () => <div data-testid="mock-vehicle-util" />,
    };
});

const mockTrips = [
    { trip_id: 'TRP-1', status: TripStatus.COMPLETED, project_id: 'P-1', date: new Date().toISOString() },
    { trip_id: 'TRP-2', status: TripStatus.COMPLETED, project_id: 'P-2', date: new Date().toISOString() }
];

const mockStore = {
    trips: mockTrips,
    projects: [
        { project_id: 'P-1', company_id: 'C-1' },
        { project_id: 'P-2', company_id: 'C-2' }
    ],
    companies: [
        { company_id: 'C-1', company_name: 'Company A' },
        { company_id: 'C-2', company_name: 'Company B' }
    ],
    services: [], vehicles: [], drivers: [],
    saasConfig: { language: 'en' },
    currentUser: { role: Role.ADMIN },
    darkMode: false,
};

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <Reports />
        </MemoryRouter>
    );
};

describe('Reports Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Main Rendering of Analytics components', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByTestId('mock-filters')).toBeInTheDocument();
            expect(screen.getByTestId('mock-stats')).toBeInTheDocument();
            expect(screen.getByTestId('mock-volume-trend')).toBeInTheDocument();
            expect(screen.getByTestId('mock-status-dist')).toBeInTheDocument();
            expect(screen.getByTestId('mock-top-projects')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Admin Data Scope (All Trips)', async () => {
        renderComponent();
        
        await waitFor(() => {
            const filters = screen.getByTestId('mock-filters');
            // Admin sees both trips
            expect(filters.getAttribute('data-tripsz')).toBe('2');
            expect(filters.getAttribute('data-restricted')).toBe('false');
        });
    });

    it('Scenario 3: Company User Scope Limits Data', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            currentUser: { role: Role.COMPANY_USER, company_id: 'C-1' }
        });
        
        renderComponent();

        await waitFor(() => {
            const filters = screen.getByTestId('mock-filters');
            // Company user should only see TRP-1 because it belongs to C-1 -> P-1
            expect(filters.getAttribute('data-tripsz')).toBe('1');
            expect(filters.getAttribute('data-restricted')).toBe('true');
        });
    });

    it('Scenario 4: Project User Scope Limits Data', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            currentUser: { role: Role.PROJECT_USER, project_id: 'P-2' }
        });
        
        renderComponent();

        await waitFor(() => {
            const filters = screen.getByTestId('mock-filters');
            // Project user should only see TRP-2 because it belongs to P-2
            expect(filters.getAttribute('data-tripsz')).toBe('1');
            expect(filters.getAttribute('data-restricted')).toBe('true');
        });
    });
});
