import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TripWizard from '@/components/trips/TripWizard';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { TripStatus, Role } from '@/types';

// Mock dependencies
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
    ChevronUp: MockIcon, Download: MockIcon, Check: MockIcon, Circle: MockIcon, Loader2: MockIcon
  };
});

vi.mock('@/utils/exportHelpers', () => ({
    generateManifestBase64: vi.fn().mockResolvedValue('fake-manifest-base64'),
    generateDeliveryNoteBase64: vi.fn().mockResolvedValue('fake-dn-base64')
}));

const mockTrips = [
    { trip_id: 'T-100', status: TripStatus.REQUESTED, waste_manifest_no: 'M-000001', delivery_note_no: 'DN-000001', vehicle_id: 'V-1', date: '2024-05-01', time: '10:00', project_id: 'P-1', service_id: 'S-1', quantity: 15, unit: 'TON' }
];

const mockStore = {
    projects: [{ project_id: 'P-1', company_id: 'C-1', project_name: 'Test Project' }],
    services: [
        { service_id: 'S-1', service_name: 'Test Service', category: 'GENERAL' },
        { service_id: 'S-HAZ', service_name: 'HAZARDOUS WASTE', category: 'HAZARDOUS' }
    ],
    companies: [{ company_id: 'C-1', company_name: 'Test Company' }],
    vehicles: [{ vehicle_id: 'V-1', plate_no: 'ABC-1234', vehicle_type: 'Truck', status: 'ACTIVE', ownership_type: 'INTERNAL' }],
    drivers: [{ driver_id: 'D-1', name: 'John Doe', status: 'ACTIVE', ownership_type: 'INTERNAL' }],
    containers: [{ container_id: 'CNT-1', code: 'BIN-01', size_id: 'SZ-1' }],
    inventorySizes: [{ size_id: 'SZ-1', name: '20 CBM' }],
    facilities: [{ facility_id: 'F-1', name: 'Dump Site A', status: 'ACTIVE', accepted_services: '["S-1", "S-HAZ"]', type: 'LANDFILL' }],
    projectServices: [
        { project_id: 'P-1', service_id: 'S-1', quantity: 100 },
        { project_id: 'P-1', service_id: 'S-HAZ', quantity: 100 }
    ],
    suppliers: [],
    users: [{ name: 'Sup1', role: Role.PROJECT_USER, project_id: 'P-1' }, { name: 'GCM_Admin', role: Role.ADMIN }],
    trips: mockTrips,
    saasConfig: { language: 'en', templateConfig: {} },
    currentUser: { role: Role.ADMIN },
    addNotification: vi.fn(),
    upsertTrip: vi.fn()
};

const renderComponent = (props = {}) => {
    return render(
        <MemoryRouter>
            <TripWizard isOpen={true} onClose={vi.fn()} {...props} />
        </MemoryRouter>
    );
};

describe('TripWizard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Required validation on Step 1 (Entity Selection)', async () => {
        renderComponent();
        
        // Attempt to proceed without selecting company/project
        const nextBtn = screen.getByText('wizard.next');
        fireEvent.click(nextBtn);

        // Should show validation error
        await waitFor(() => {
            expect(screen.getByText('wizard.validation.entityRequired')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Successful transition to Step 2 when Entity is filled', async () => {
        renderComponent();

        // 1. Select Company
        const companySelect = screen.getByRole('combobox', { name: /analytics.filters.company/i });
        fireEvent.change(companySelect, { target: { value: 'C-1' } });

        // 2. Select Project
        const projectSelect = screen.getByRole('combobox', { name: /analytics.filters.project/i });
        fireEvent.change(projectSelect, { target: { value: 'P-1' } });

        // Proceed
        fireEvent.click(screen.getByText('wizard.next'));

        // Should move to phase 2 (Logistics)
        await waitFor(() => {
            // "wizard.date" should be visible in Step 2
            expect(screen.getByText('wizard.date')).toBeInTheDocument();
        });
    });

    it('Scenario 3: Duplication Prevention (Manifest Number)', async () => {
        // Setup initial trip to mock Editing existing one that triggers duplication error
        const existingTrip = { 
            ...mockTrips[0], 
            trip_id: 'T-999', 
            waste_manifest_no: '',
            is_manifest_generated: true,
            is_delivery_note_generated: true
        };
        renderComponent({ tripToEdit: existingTrip, initialStep: 4 });

        // Attempt to enter an existing manifest number (M-000001)
        const manifestInputs = await screen.findAllByRole('textbox');
        const manifestInput = manifestInputs.find(i => (i as HTMLInputElement).placeholder.includes('M-XXXXXX'));
        expect(manifestInput).toBeTruthy();
        
        fireEvent.change(manifestInput!, { target: { value: 'M-000001' } });

        // Try to save directly (bypassing other validations for testing sake)
        // Wait, save button uses handleSave
        const saveBtns = screen.getAllByRole('button');
        const saveBtn = saveBtns.find(b => b.textContent?.includes('wizard.save'));
        
        if (saveBtn) {
            fireEvent.click(saveBtn);
        }

        // Wait for error (Manifest Duplicate)
        await waitFor(() => {
            expect(screen.getByText(/Manifest #M-000001 already exists/i)).toBeInTheDocument();
        });
    });

    it('Scenario 4: Auto-generation of Manifest formats', async () => {
        renderComponent({ initialStep: 4, tripToEdit: { ...mockTrips[0], trip_id: 'T-NEW', waste_manifest_no: '', is_manifest_generated: true } });

        // Click generate manifest button
        const generateBtns = await screen.findAllByRole('button', { name: /wizard.generate/i });
        if (generateBtns.length > 0) {
            fireEvent.click(generateBtns[0]);
        }

        await waitFor(() => {
            const manifestInputs = screen.getAllByRole('textbox');
            const manifestInput = manifestInputs.find(i => (i as HTMLInputElement).placeholder.includes('M-XXXXXX'));
            // Since M-000001 is inside mockTrips, the next should be M-000002
            expect((manifestInput as HTMLInputElement).value).toBe('M-000002');
        });
    });

    it('Scenario 5: Auto-enforces Hazardous Waste constraint (KG)', async () => {
        renderComponent({ initialStep: 3, tripToEdit: { ...mockTrips[0], trip_id: 'T-NEW' } });
        
        const serviceSelect = await screen.findByRole('combobox', { name: /wizard.serviceType/i });
        fireEvent.change(serviceSelect, { target: { value: 'S-HAZ' } });

        await waitFor(() => {
            // Hazardous Waste automatically forces KG and disables TON button options
            const kgButton = screen.queryByRole('button', { name: 'KG' });
            expect(kgButton).toBeInTheDocument();
            const tonButton = screen.queryByRole('button', { name: 'TON' });
            expect(tonButton).not.toBeInTheDocument();
        });
    });
});
