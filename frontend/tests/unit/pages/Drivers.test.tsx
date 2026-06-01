import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Drivers from '@/pages/Drivers';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { Role } from '@/types';

vi.mock('@/context');
vi.mock('@/hooks/useTranslation');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return new Proxy({}, {
    get: function(target, prop) {
      if (prop === '__esModule') return true;
      return MockIcon;
    }
  });
});

vi.mock('@/components/drivers/DriverWizard', () => ({
    default: ({ onSave, currentStaff }: any) => (
        <div data-testid="mock-wizard">
            Wizard Open
            <button onClick={() => onSave(currentStaff, [])}>Mock Save</button>
        </div>
    )
}));

vi.mock('@/components/drivers/DriverDetails', () => ({
    default: ({ driver }: any) => <div data-testid={`mock-details-${driver?.driver_id}`}>Details Open</div>
}));

vi.mock('@/components/drivers/DriverCard', () => ({
    default: ({ staff, onView, onEdit, onDelete }: any) => (
        <div data-testid={`mock-driver-card-${staff.driver_id}`}>
            {staff.name}
            <button onClick={() => onView(staff)}>View</button>
            <button onClick={() => onEdit(staff)}>Edit</button>
            <button onClick={() => onDelete(staff.driver_id)}>Delete</button>
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

vi.mock('@/utils/excelUtils', () => ({
    exportToExcel: vi.fn(),
    importFromExcel: vi.fn().mockResolvedValue([]),
    exportTemplate: vi.fn()
}));

const mockDrivers = [
    { driver_id: 'D-1', name: 'John Doe', category: 'OPERATIONS', status: 'ACTIVE', ownership_type: 'INTERNAL' },
    { driver_id: 'D-2', name: 'Jane Smith', category: 'MANAGEMENT', status: 'ACTIVE', ownership_type: 'INTERNAL' },
    { driver_id: 'D-3', name: 'Bob Worker', category: 'OPERATIONS', status: 'INACTIVE', ownership_type: 'SUPPLIER', supplier_id: 'S-1' }
];

const mockStore = {
    drivers: mockDrivers,
    suppliers: [], trips: [], vehicles: [], projects: [], companies: [], users: [],
    saasConfig: { language: 'en', managementControlsEnabled: true },
    currentUser: { role: Role.ADMIN },
    exportEnabled: true,
    addNotification: vi.fn(),
    deleteDriver: vi.fn(),
    upsertDriver: vi.fn(),
    requestAddition: vi.fn()
};

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <Drivers />
        </MemoryRouter>
    );
};

describe('Drivers Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Main Rendering and Stats display', async () => {
        renderComponent();

        expect(screen.getByText('Staff Resources')).toBeInTheDocument();
        
        // Wait for list items to render via DriverCard
        await waitFor(() => {
            expect(screen.getByTestId('mock-driver-card-D-1')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        // 3 total, 2 active, 2 operations, 1 management
        expect(screen.getAllByText('3').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2').length).toBeGreaterThan(0);
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });

    it('Scenario 2: Global Search Filtering', async () => {
        renderComponent();

        const searchInput = screen.getByRole('textbox'); 
        
        fireEvent.change(searchInput, { target: { value: 'Jane' } });

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Category Tab Filtering', async () => {
        renderComponent();

        const mgmtTab = screen.getByRole('button', { name: /MGMT/i });
        fireEvent.click(mgmtTab);

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        });

        const opsTab = screen.getByRole('button', { name: /OPS/i });
        fireEvent.click(opsTab);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        });
    });

    it('Scenario 4: Add new staff opens Wizard modal', async () => {
        renderComponent();

        const addBtn = screen.getByRole('button', { name: /New Staff/i });
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByTestId('mock-wizard')).toBeInTheDocument();
            expect(screen.getByText('Personnel Data Engineering')).toBeInTheDocument();
        });

        const mockSaveBtn = screen.getByText('Mock Save');
        fireEvent.click(mockSaveBtn);
        expect(mockStore.upsertDriver).toHaveBeenCalled();
    });

    it('Scenario 5: Handle Subcontractor role Request Addition', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            currentUser: { role: Role.SUBCONTRACTOR, supplier_id: 'S-1' }
        });
        
        renderComponent();

        const addBtn = screen.getByRole('button', { name: /New Staff/i });
        fireEvent.click(addBtn);

        await waitFor(() => { screen.getByTestId('mock-wizard'); });
        
        const mockSaveBtn = screen.getByText('Mock Save');
        fireEvent.click(mockSaveBtn);

        // Subcontractors request additions, they don't insert directly
        expect(mockStore.requestAddition).toHaveBeenCalled();
    });

    it('Scenario 6: Handle deletion workflow', async () => {
        renderComponent();

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]); // Delete D-1

        await waitFor(() => {
            expect(screen.getByTestId('mock-delete-modal')).toBeInTheDocument();
        });

        const confirmBtn = screen.getByText('Confirm Delete');
        fireEvent.click(confirmBtn);

        expect(mockStore.deleteDriver).toHaveBeenCalledWith('D-1');
    });
});
