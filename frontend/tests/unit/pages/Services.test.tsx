import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Services from '@/pages/Services';
import { useStore } from '@/context';
import { NotificationType } from '@/types';

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

vi.mock('@/components', () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    Modal: ({ isOpen, children, title }: any) => isOpen ? <div data-testid="mock-modal"><h2>{title}</h2>{children}</div> : null,
    Button: ({ children, onClick, icon: Icon, ...rest }: any) => <button onClick={onClick} {...rest}>{children}</button>,
    Input: ({ value, onChange, placeholder, ...rest }: any) => <input value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} {...rest} />,
    ServiceStats: ({ stats }: any) => <div data-testid="mock-service-stats">{stats.total} total</div>,
    ServiceTree: ({ services, onEdit, onDelete, onAddChild }: any) => (
        <div data-testid="mock-service-tree">
            {services.map((s: any) => (
                <div key={s.service_id} data-testid={`service-${s.service_id}`}>
                    {s.service_name}
                    <button onClick={() => onEdit(s)}>Edit</button>
                    <button onClick={() => onDelete(s.service_id)}>Delete</button>
                    <button onClick={() => onAddChild(s.service_id)}>Add Child</button>
                </div>
            ))}
        </div>
    ),
    ServiceWizard: ({ onSave }: any) => <div data-testid="mock-service-wizard"><button onClick={onSave}>Save Service</button></div>,
    ServiceDashboardModal: ({ isOpen }: any) => isOpen ? <div data-testid="mock-service-dashboard-modal" /> : null
}));

vi.mock('@/components/dashboard/ServiceAnalytics', () => ({
    ServiceAnalytics: () => <div data-testid="mock-service-analytics" />
}));

vi.mock('@/utils/excelUtils', () => ({
    exportToExcel: vi.fn(),
    importFromExcel: vi.fn().mockResolvedValue([]),
    exportTemplate: vi.fn()
}));

const mockServices = [
    { service_id: 'S-1', service_name: 'Waste Collection', service_description: 'General waste', parent_id: null },
    { service_id: 'S-2', service_name: 'Hazardous Waste', service_description: 'Chemical waste', parent_id: 'S-1' },
    { service_id: 'S-3', service_name: 'Recycling', service_description: 'Sort and recycle', parent_id: null },
];

const mockStore = {
    services: mockServices,
    trips: [],
    projectServices: [],
    saasConfig: { language: 'en' },
    exportEnabled: true,
    addNotification: vi.fn(),
    upsertService: vi.fn(),
    deleteService: vi.fn()
};

const renderComponent = () => render(
    <MemoryRouter><Services /></MemoryRouter>
);

describe('Services Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('Scenario 1: Renders service hub with stats and tree', async () => {
        renderComponent();

        expect(screen.getByText('Material & Service Hub')).toBeInTheDocument();
        expect(screen.getByTestId('mock-service-stats')).toBeInTheDocument();
        expect(screen.getByTestId('mock-service-tree')).toBeInTheDocument();
        expect(screen.getByTestId('mock-service-analytics')).toBeInTheDocument();
    });

    it('Scenario 2: Create Category opens modal', async () => {
        renderComponent();

        const addBtn = screen.getByRole('button', { name: /Create Category/i });
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
            expect(screen.getByText('New Service Record')).toBeInTheDocument();
        });
    });

    it('Scenario 3: Edit service opens modal with edit title', async () => {
        renderComponent();

        const editBtns = screen.getAllByText('Edit');
        fireEvent.click(editBtns[0]); // Edit Waste Collection

        await waitFor(() => {
            expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
            expect(screen.getByText('Edit Service Record')).toBeInTheDocument();
        });
    });

    it('Scenario 4: Search filters tree', async () => {
        renderComponent();

        const searchInput = screen.getByPlaceholderText('Search catalog...');
        fireEvent.change(searchInput, { target: { value: 'Recycling' } });

        await waitFor(() => {
            expect(screen.getByText('Recycling')).toBeInTheDocument();
            // Waste Collection should be filtered out since it doesn't match
            expect(screen.queryByTestId('service-S-1')).not.toBeInTheDocument();
        });
    });

    it('Scenario 5: Delete confirmation opens modal', async () => {
        renderComponent();

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => {
            expect(screen.getByText('Confirm Permanent Deletion')).toBeInTheDocument();
            expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
        });
    });
});
