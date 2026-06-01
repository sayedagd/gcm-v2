import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/pages/Dashboard';
import { useStore } from '@/context';
import { Role, TripStatus } from '@/types';

vi.mock('@/context');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return {
    Building2: MockIcon, MapPin: MockIcon, ArrowRight: MockIcon, UserCheck: MockIcon,
    Truck: MockIcon, HardHat: MockIcon, Activity: MockIcon, FileText: MockIcon,
    FileCheck: MockIcon, Recycle: MockIcon, Package: MockIcon, Navigation: MockIcon,
    AlertCircle: MockIcon, AlertTriangle: MockIcon, Upload: MockIcon, Wand2: MockIcon, X: MockIcon, CheckCircle2: MockIcon,
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
    Mail: MockIcon, LayoutDashboard: MockIcon, Sun: MockIcon, Moon: MockIcon
  };
});

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_: any, prop: string) => {
            if (typeof prop === 'symbol') return undefined;
            return ({ children, ...rest }: any) => <div>{children}</div>;
        }
    })
}));

// Mock ALL sub-components to prevent deep rendering
vi.mock('@/components/dashboard/StatsGrid', () => ({ StatsGrid: () => <div data-testid="mock-stats-grid" /> }));
vi.mock('@/components/dashboard/OperationsHub', () => ({ OperationsHub: () => <div data-testid="mock-operations-hub" /> }));
vi.mock('@/components/dashboard/ServiceDistribution', () => ({ ServiceDistribution: () => <div data-testid="mock-service-dist" /> }));
vi.mock('@/components/dashboard/ActivityFeed', () => ({ ActivityFeed: () => <div data-testid="mock-activity-feed" /> }));
vi.mock('@/components/dashboard/FleetAnalytics', () => ({ FleetAnalytics: () => <div data-testid="mock-fleet-analytics" /> }));
vi.mock('@/components/dashboard/InventoryAnalytics', () => ({ InventoryAnalytics: () => <div data-testid="mock-inventory-analytics" /> }));
vi.mock('@/components/dashboard/CommunicationsDeck', () => ({ CommunicationsDeck: () => <div data-testid="mock-comms-deck" /> }));
vi.mock('@/components/dashboard/AssetAllocationWidget', () => ({ AssetAllocationWidget: () => <div data-testid="mock-asset-allocation" /> }));
vi.mock('@/components/trips/TripWizard', () => ({ default: () => <div data-testid="mock-trip-wizard" /> }));
vi.mock('@/components', () => ({
    Button: ({ children, onClick, ...rest }: any) => <button onClick={onClick}>{children}</button>,
    Card: ({ children, className }: any) => <div className={className}>{children}</div>
}));
vi.mock('@/utils/helpers', () => ({
    formatDate: (d: any) => '2025-01-01'
}));

const mockStore = {
    trips: [
        { trip_id: 'TRP-1', status: TripStatus.PENDING_DOCS, project_id: 'P-1', service_id: 'S-1', date: '2025-01-01' },
        { trip_id: 'TRP-2', status: TripStatus.EN_ROUTE, date: '2025-01-01' }
    ],
    projects: [{ project_id: 'P-1', project_name: 'Alpha Project' }],
    services: [{ service_id: 'S-1', service_name: 'Waste Removal', parent_id: null }],
    vehicles: [],
    containers: [],
    tanks: [],
    assetServiceLinks: [],
    saasConfig: { language: 'en' },
    currentUser: { role: Role.ADMIN },
    darkMode: false,
    booting: false,
    setDarkMode: vi.fn(),
    upsertTrip: vi.fn()
};

const renderComponent = () => render(
    <MemoryRouter><Dashboard /></MemoryRouter>
);

describe('Dashboard Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('Scenario 1: Renders core dashboard layout', async () => {
        renderComponent();
        expect(screen.getByText('Command Center')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId('mock-stats-grid')).toBeInTheDocument();
            expect(screen.getByTestId('mock-operations-hub')).toBeInTheDocument();
            expect(screen.getByTestId('mock-service-dist')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Admin sees Pending Documentation section', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Pending Documentation')).toBeInTheDocument();
            expect(screen.getByText('TRP-1')).toBeInTheDocument();
        });
    });

    it('Scenario 3: Non-privileged roles do NOT see Pending Docs', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            currentUser: { role: Role.LOGISTICS }
        });
        renderComponent();
        expect(screen.queryByText('Pending Documentation')).not.toBeInTheDocument();
    });
});
