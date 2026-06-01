import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Suppliers from '@/pages/Suppliers';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { Role } from '@/types';

vi.mock('@/context');
vi.mock('@/hooks/useTranslation');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return {
    AlertTriangle: MockIcon, Building2: MockIcon, MapPin: MockIcon, ArrowRight: MockIcon,
    UserCheck: MockIcon, Mail: MockIcon, Phone: MockIcon, CheckCircle: MockIcon,
    Briefcase: MockIcon, Scale: MockIcon, Download: MockIcon, Archive: MockIcon,
    Search: MockIcon, Filter: MockIcon, UserPlus: MockIcon, Globe: MockIcon,
    X: MockIcon, FileUp: MockIcon, ChevronDown: MockIcon, Trash2: MockIcon,
    Sparkles: MockIcon, FileIcon: MockIcon, FileDown: MockIcon, Eye: MockIcon,
    DownloadCloud: MockIcon, Edit2: MockIcon, Plus: MockIcon, Calendar: MockIcon,
    Settings: MockIcon, Menu: MockIcon, Bell: MockIcon, ChevronLeft: MockIcon,
    ChevronRight: MockIcon, ChevronUp: MockIcon, Check: MockIcon, Circle: MockIcon,
    Loader2: MockIcon, LayoutGrid: MockIcon, List: MockIcon, Zap: MockIcon,
    ShieldCheck: MockIcon, DollarSign: MockIcon, HelpCircle: MockIcon, User: MockIcon,
    Key: MockIcon, Clock: MockIcon, Edit3: MockIcon, Shield: MockIcon, Map: MockIcon,
    ShieldAlert: MockIcon, PlusCircle: MockIcon, LogIn: MockIcon, LogOut: MockIcon,
    Database: MockIcon, ScrollText: MockIcon, Info: MockIcon, Camera: MockIcon,
    Home: MockIcon, Save: MockIcon, BarChart2: MockIcon, PieChart: MockIcon,
    TrendingUp: MockIcon, FileSpreadsheet: MockIcon, Wrench: MockIcon,
    Activity: MockIcon, Package: MockIcon, Truck: MockIcon, CheckCircle2: MockIcon,
    FileText: MockIcon, FileCheck: MockIcon, Target: MockIcon, Paperclip: MockIcon,
    CreditCard: MockIcon, UserPlus2: MockIcon
  };
});

vi.mock('@/components/suppliers/SupplierWizard', () => ({
    default: ({ isOpen, onSave, supplier }: any) => isOpen ? (
        <div data-testid="mock-wizard">
            Wizard Open
            <button onClick={() => onSave(supplier)}>Mock Save</button>
        </div>
    ) : null
}));

vi.mock('@/components/suppliers/SupplierDetails', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="mock-details">Details Open</div> : null
}));

vi.mock('@/components/suppliers/SupplierCard', () => ({
    default: ({ supplier, onView, onEdit, onDelete }: any) => (
        <div data-testid={`mock-supplier-card-${supplier.supplier_id}`}>
            {supplier.name}
            <button onClick={() => onView(supplier)}>View</button>
            <button onClick={() => onEdit(supplier)}>Edit</button>
            <button onClick={() => onDelete(supplier.supplier_id)}>Delete</button>
        </div>
    )
}));

vi.mock('@/components/common/DeleteConfirmModal', () => ({
    default: ({ isOpen, onConfirm }: any) => isOpen ? (
        <div data-testid="mock-delete-modal">
            <button onClick={onConfirm}>Confirm Delete</button>
        </div>
    ) : null
}));

vi.mock('@/components/suppliers/SupplierStats', () => ({
    default: () => <div data-testid="mock-supplier-stats" />
}));

// Mock recharts to prevent canvas rendering errors
vi.mock('recharts', () => ({
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div />,
    Tooltip: () => <div />,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>
}));

const mockSuppliers = [
    { supplier_id: 'S-1', name: 'Global Haulers', category: 'VEHICLES', status: 'ACTIVE' },
    { supplier_id: 'S-2', name: 'Bin Suppliers LLC', category: 'CONTAINERS', status: 'ACTIVE' },
    { supplier_id: 'S-3', name: 'Manpower Corp', category: 'STAFF', status: 'INACTIVE' }
];

const mockStore = {
    suppliers: mockSuppliers,
    vehicles: [{ vehicle_id: 'V-1', supplier_id: 'S-1' }],
    containers: [], tanks: [], drivers: [], users: [],
    assetRequests: [],
    saasConfig: { language: 'en' },
    currentUser: { role: Role.ADMIN },
    exportEnabled: true,
    addNotification: vi.fn(),
    deleteSupplier: vi.fn(),
    upsertSupplier: vi.fn(),
    processAssetRequest: vi.fn()
};

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <Suppliers />
        </MemoryRouter>
    );
};

describe('Suppliers Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Full Rendering and initial display', async () => {
        renderComponent();

        expect(screen.getByText('Suppliers Hub')).toBeInTheDocument();
        expect(screen.getByTestId('mock-supplier-stats')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByTestId('mock-supplier-card-S-1')).toBeInTheDocument();
            expect(screen.getByText('Global Haulers')).toBeInTheDocument();
            expect(screen.getByText('Bin Suppliers LLC')).toBeInTheDocument();
            expect(screen.getByText('Manpower Corp')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Category Tabs Filtering', async () => {
        renderComponent();

        const vehiclesTab = screen.getByRole('button', { name: /Fleet/i });
        fireEvent.click(vehiclesTab);

        await waitFor(() => {
            expect(screen.getByText('Global Haulers')).toBeInTheDocument();
            expect(screen.queryByText('Bin Suppliers LLC')).not.toBeInTheDocument();
            expect(screen.queryByText('Manpower Corp')).not.toBeInTheDocument();
        });

        const assetsTab = screen.getByRole('button', { name: /Assets/i });
        fireEvent.click(assetsTab);

        await waitFor(() => {
            expect(screen.getByText('Bin Suppliers LLC')).toBeInTheDocument();
            expect(screen.queryByText('Global Haulers')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: View Supplier action', async () => {
        renderComponent();

        const viewBtns = screen.getAllByText('View');
        fireEvent.click(viewBtns[0]); // View S-1

        await waitFor(() => {
            expect(screen.getByTestId('mock-details')).toBeInTheDocument();
        });
    });

    it('Scenario 4: Edit Supplier action opens Wizard', async () => {
        renderComponent();

        const editBtns = screen.getAllByText('Edit');
        fireEvent.click(editBtns[0]); // Edit S-1

        await waitFor(() => {
            expect(screen.getByTestId('mock-wizard')).toBeInTheDocument();
        });
    });

    it('Scenario 5: Delete Workflow', async () => {
        renderComponent();

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]); // Delete S-1

        await waitFor(() => {
            expect(screen.getByTestId('mock-delete-modal')).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Confirm Delete');
        fireEvent.click(confirmBtn);

        expect(mockStore.deleteSupplier).toHaveBeenCalledWith('S-1');
    });

    it('Scenario 6: Subcontractor Role Restrictions', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            currentUser: { role: Role.SUBCONTRACTOR, supplier_id: 'S-2' }
        });
        
        renderComponent();

        // Stats should be hidden
        expect(screen.queryByTestId('mock-supplier-stats')).not.toBeInTheDocument();

        // Only see their own supplier card (S-2)
        await waitFor(() => {
            expect(screen.getByText('Bin Suppliers LLC')).toBeInTheDocument();
            expect(screen.queryByText('Global Haulers')).not.toBeInTheDocument();
        });
    });
});
