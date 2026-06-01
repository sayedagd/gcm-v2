import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Inventory from '@/pages/Inventory';
import { useStore } from '@/context';
import { Role } from '@/types';

vi.mock('@/context');

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

vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('@/components', () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    Modal: ({ isOpen, children, title }: any) => isOpen ? <div data-testid="mock-modal"><h2>{title}</h2>{children}</div> : null,
    Button: ({ children, onClick, disabled, ...rest }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    EmptyState: ({ title }: any) => <div data-testid="mock-empty">{title}</div>,
    PageHeader: ({ children, title, actionLabel, onActionClick }: any) => (
        <div data-testid="mock-page-header">
            <h1>{title}</h1>
            <button onClick={onActionClick}>{actionLabel}</button>
            {children}
        </div>
    ),
    InventoryStats: ({ globalStats }: any) => <div data-testid="mock-inv-stats">{globalStats.totalBins} bins</div>,
    InventoryCard: ({ item, onView, onEdit, onDelete, activeTab }: any) => {
        const id = item.container_id || item.tank_id || item.size_id;
        return (
            <div data-testid={`mock-inv-card-${id}`}>
                {item.code || item.name}
                <button onClick={() => onView(item)}>View</button>
                <button onClick={() => onEdit(item)}>Edit</button>
                <button onClick={() => onDelete(id)}>Delete</button>
            </div>
        );
    },
    InventoryDetails: ({ item }: any) => <div data-testid="mock-inv-details">Details</div>,
    InventoryWizard: ({ onSave }: any) => <div data-testid="mock-inv-wizard"><button onClick={onSave}>Save Asset</button></div>
}));

vi.mock('@/utils/excelUtils', () => ({
    exportToExcel: vi.fn(),
    importFromExcel: vi.fn().mockResolvedValue([]),
    exportTemplate: vi.fn()
}));

const mockContainers = [
    { container_id: 'CON-1', code: 'BIN-001', status: 'IN_USE', ownership: 'OWN' },
    { container_id: 'CON-2', code: 'BIN-002', status: 'AVAILABLE', ownership: 'SUPPLIER' },
];

const mockTanks = [
    { tank_id: 'TNK-1', code: 'TANK-001', status: 'IN_USE', ownership: 'OWN' },
];

const mockStore = {
    containers: mockContainers,
    tanks: mockTanks,
    inventorySizes: [{ size_id: 'SZ-1', name: '12m³', type: 'CONTAINER' }],
    projects: [], companies: [], trips: [], suppliers: [],
    saasConfig: { language: 'en', managementControlsEnabled: true },
    currentUser: { role: Role.ADMIN },
    exportEnabled: true,
    addNotification: vi.fn(),
    upsertContainer: vi.fn(), deleteContainer: vi.fn(),
    upsertTank: vi.fn(), deleteTank: vi.fn(),
    upsertInventorySize: vi.fn(), deleteInventorySize: vi.fn()
};

const renderComponent = () => render(
    <MemoryRouter><Inventory /></MemoryRouter>
);

describe('Inventory Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('Scenario 1: Renders containers tab by default', async () => {
        renderComponent();

        expect(screen.getByText('Asset & Supply Hub')).toBeInTheDocument();
        expect(screen.getByTestId('mock-inv-stats')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId('mock-inv-card-CON-1')).toBeInTheDocument();
            expect(screen.getByText('BIN-001')).toBeInTheDocument();
            expect(screen.getByText('BIN-002')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Switch to Tanks tab', async () => {
        renderComponent();

        const tanksTab = screen.getByRole('button', { name: /Fluid Tanks/i });
        fireEvent.click(tanksTab);

        await waitFor(() => {
            expect(screen.getByTestId('mock-inv-card-TNK-1')).toBeInTheDocument();
            expect(screen.getByText('TANK-001')).toBeInTheDocument();
            expect(screen.queryByText('BIN-001')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Switch to Dimensions tab', async () => {
        renderComponent();

        const sizesTab = screen.getByRole('button', { name: /Dimensions/i });
        fireEvent.click(sizesTab);

        await waitFor(() => {
            expect(screen.getByTestId('mock-inv-card-SZ-1')).toBeInTheDocument();
            expect(screen.getByText('12m³')).toBeInTheDocument();
        });
    });

    it('Scenario 4: Add New Asset opens wizard', async () => {
        renderComponent();

        const addBtn = screen.getByRole('button', { name: /New Asset/i });
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
            expect(screen.getByText('Asset Data Engineering')).toBeInTheDocument();
        });
    });

    it('Scenario 5: View Asset opens details', async () => {
        renderComponent();

        const viewBtns = screen.getAllByText('View');
        fireEvent.click(viewBtns[0]);

        await waitFor(() => {
            expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
            expect(screen.getByText('Asset Intelligence Hub')).toBeInTheDocument();
        });
    });
});
