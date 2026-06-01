import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Trips from '@/pages/Trips';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { TripStatus, Role } from '@/types';

vi.mock('@/context');
vi.mock('@/hooks/useTranslation');
vi.mock('@/store/useSupplierRates', () => ({
    useSupplierRates: () => ({ rates: [], fetchRates: vi.fn() })
}));
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
    ChevronUp: MockIcon, Download: MockIcon, Check: MockIcon, Circle: MockIcon, Loader2: MockIcon
  };
});
vi.mock('@/components/trips/TripWizard', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="mock-wizard">Wizard Open</div> : null
}));
vi.mock('@/components/trips/TripDetailsModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="mock-details">Details Open</div> : null
}));
vi.mock('@/utils/excelUtils', () => ({
    exportToExcel: vi.fn(),
    importFromExcel: vi.fn().mockResolvedValue([]),
    exportTemplate: vi.fn()
}));

const mockTrips = [
    { trip_id: 'T-101', status: TripStatus.COMPLETED, date: '2024-05-01', time: '10:00', driver_id: 'D-1', vehicle_id: 'V-1', project_id: 'P-1', service_id: 'S-1', quantity: 15, unit: 'TON' },
    { trip_id: 'T-102', status: TripStatus.REQUESTED, date: '2024-05-02', time: '14:30', driver_id: 'D-2', vehicle_id: 'V-2', project_id: 'P-1', service_id: 'S-HAZ', quantity: 500, unit: 'KG' },
    { trip_id: 'T-103', status: TripStatus.PENDING_REVIEW, date: '2024-05-03', time: '08:00', driver_id: 'D-1', vehicle_id: 'V-1', project_id: 'P-2', service_id: 'S-1', quantity: 20, unit: 'TON' }
];

const mockStore = {
    projects: [
        { project_id: 'P-1', company_id: 'C-1', project_name: 'Alpha Site' },
        { project_id: 'P-2', company_id: 'C-2', project_name: 'Beta Site' }
    ],
    services: [
        { service_id: 'S-1', service_name: 'General Waste' },
        { service_id: 'S-HAZ', service_name: 'Hazardous' }
    ],
    companies: [
        { company_id: 'C-1', company_name: 'Acme Corp' },
        { company_id: 'C-2', company_name: 'Globex' }
    ],
    vehicles: [
        { vehicle_id: 'V-1', plate_no: 'TRK-01' },
        { vehicle_id: 'V-2', plate_no: 'TRK-02' }
    ],
    drivers: [
        { driver_id: 'D-1', name: 'Alice' },
        { driver_id: 'D-2', name: 'Bob' }
    ],
    trips: mockTrips,
    saasConfig: { language: 'en' },
    currentUser: { role: Role.ADMIN },
    exportEnabled: true,
    addNotification: vi.fn(),
    deleteTrip: vi.fn(),
    upsertTrip: vi.fn()
};

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <Trips />
        </MemoryRouter>
    );
};

describe('Trips Page - Core Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Full Rendering and Grid display', async () => {
        renderComponent();

        expect(screen.getByText('Field Operations Log')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('T-101')).toBeInTheDocument();
            expect(screen.getByText('T-102')).toBeInTheDocument();
            expect(screen.getByText('T-103')).toBeInTheDocument();
        });

        expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
        expect(screen.getByText('Globex')).toBeInTheDocument();
        expect(screen.getAllByText('Alice').length).toBe(2);
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getAllByText('TRK-01').length).toBeGreaterThan(0);
    });

    it('Scenario 2: Global Search Filtering', async () => {
        renderComponent();

        const searchInput = screen.getByPlaceholderText(/Global Search/i);
        
        fireEvent.change(searchInput, { target: { value: 'Bob' } });

        await waitFor(() => {
            expect(screen.getByText('T-102')).toBeInTheDocument();
            expect(screen.queryByText('T-101')).not.toBeInTheDocument();
        });

        fireEvent.change(searchInput, { target: { value: '' } });
        fireEvent.change(searchInput, { target: { value: 'T-103' } });

        await waitFor(() => {
            expect(screen.getByText('T-103')).toBeInTheDocument();
            expect(screen.queryByText('T-101')).not.toBeInTheDocument();
            expect(screen.queryByText('T-102')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Status Tabs Filtering', async () => {
        renderComponent();

        expect(screen.getByText('T-101')).toBeInTheDocument();

        const reqBtn = screen.getByRole('button', { name: /Reqs/i });
        fireEvent.click(reqBtn);

        await waitFor(() => {
            expect(screen.getByText('T-102')).toBeInTheDocument(); 
            expect(screen.queryByText('T-101')).not.toBeInTheDocument(); 
            expect(screen.queryByText('T-103')).not.toBeInTheDocument(); 
        });

        const doneBtn = screen.getByRole('button', { name: /Done/i });
        fireEvent.click(doneBtn);

        await waitFor(() => {
            expect(screen.getByText('T-101')).toBeInTheDocument(); 
            expect(screen.queryByText('T-102')).not.toBeInTheDocument(); 
        });
    });

    it('Scenario 4: Service Type Filtering', async () => {
        renderComponent();

        const materialSelect = screen.getByRole('combobox', { name: /Service Filter/i });
        fireEvent.change(materialSelect, { target: { value: 'S-HAZ' } });

        await waitFor(() => {
            expect(screen.getByText('T-102')).toBeInTheDocument();
            expect(screen.queryByText('T-101')).not.toBeInTheDocument();
        });
    });

    it('Scenario 5: Admin Workflow Permissions (Approve btn visibility)', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('T-103')).toBeInTheDocument();
        });

        const approveBtn = screen.getByRole('button', { name: /Approve/i });
        expect(approveBtn).toBeInTheDocument();

        window.confirm = vi.fn().mockReturnValue(true);
        fireEvent.click(approveBtn);

        expect(mockStore.upsertTrip).toHaveBeenCalledWith(expect.objectContaining({ 
            trip_id: 'T-103', 
            status: TripStatus.COMPLETED 
        }));
    });
});
