/**
 * =====================================================
 * PHASE 4D — Domain Component Tests
 * Target: TripDetailsModal
 * =====================================================
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TripDetailsModal from '@/components/trips/TripDetailsModal';
import { TripStatus, Role } from '@/types';

// Mock Zustand Store
const mockUpsertTrip = vi.fn();
const mockAddNotification = vi.fn();

vi.mock('@/context', () => ({
    useStore: () => ({
        projects: [{ project_id: 'P1', project_name: 'Metro Line', company_id: 'C1' }],
        services: [{ service_id: 'S1', service_name: 'Waste Disposal' }],
        companies: [{ company_id: 'C1', company_name: 'Builders Inc' }],
        vehicles: [{ vehicle_id: 'V1', plate_no: 'ABC-123', vehicle_type: 'Truck', ownership_type: 'INTERNAL' }],
        drivers: [{ driver_id: 'D1', name: 'Alim', phone: '050' }],
        containers: [{ container_id: 'CONT1', code: 'C-001' }],
        suppliers: [],
        facilities: [],
        saasConfig: { language: 'en', templateConfig: {} },
        upsertTrip: mockUpsertTrip,
        addNotification: mockAddNotification,
        currentUser: { role: Role.ADMIN, user_id: 'U1' }
    })
}));

// Mock Export helpers
vi.mock('@/utils/exportHelpers', () => ({
    printTripTicket: vi.fn(),
    generateDeliveryNoteBase64: vi.fn().mockResolvedValue('mock-base64')
}));

// Mock Modal and Button to avoid deep nested mounting issues
vi.mock('@/components', () => ({
    Modal: ({ isOpen, children, title }: any) => isOpen ? <div data-testid="mock-modal"><h2>{title}</h2>{children}</div> : null,
    Button: ({ onClick, children, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
    Select: ({ value, onChange, options }: any) => (
        <select value={value} onChange={e => onChange(e.target.value)} data-testid="mock-select">
            {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    )
}));

// Provide a global window.confirm
const originalConfirm = window.confirm;

describe('TripDetailsModal', () => {
    const mockTrip = {
        trip_id: 'TRP-100',
        project_id: 'P1',
        service_id: 'S1',
        vehicle_id: 'V1',
        driver_id: 'D1',
        status: TripStatus.PENDING_REVIEW,
        date: '2024-05-01',
        time: '14:00',
        priority: 'HIGH',
        quantity: 10,
        unit: 'TON',
        notes: 'Handle with care',
        issue_notes: 'Driver was late',
        container_size: '20ft',
        inventory_item_id: 'CONT1',
        waste_manifest_no: 'WM-123',
        manifest_file: 'some-url'
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn().mockReturnValue(true);
    });

    afterEach(() => {
        window.confirm = originalConfirm;
    });

    it('does not render when isOpen is false', () => {
        render(<TripDetailsModal isOpen={false} onClose={() => {}} selectedTrip={mockTrip} />);
        expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });

    it('does not render when selectedTrip is null', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={null} />);
        expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });

    it('renders trip data and resolving mapped nested objects correctly', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        expect(screen.getByText('TRP-100')).toBeInTheDocument();
        expect(screen.getByText('Builders Inc')).toBeInTheDocument(); // Resolves company
        expect(screen.getByText('Metro Line')).toBeInTheDocument(); // Resolves project
        expect(screen.getByText('ABC-123')).toBeInTheDocument(); // Resolves vehicle
        expect(screen.getByText('Alim')).toBeInTheDocument(); // Resolves driver
        expect(screen.getByText('Waste Disposal')).toBeInTheDocument(); // Resolves service
        expect(screen.getByText('Handle with care')).toBeInTheDocument(); // Notes
        expect(screen.getByText('WM-123')).toBeInTheDocument(); // Manifest No
    });

    it('shows priority badge if not NORMAL', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('displays client issue notes when available', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        expect(screen.getByText('Driver was late')).toBeInTheDocument();
    });

    it('shows Approve Trip button for ADMIN on PENDING_REVIEW', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        expect(screen.getByText('Approve Trip')).toBeInTheDocument();
    });

    it('calls upsertTrip to COMPLETED when ADMIN approves PENDING_REVIEW', async () => {
        const onClose = vi.fn();
        render(<TripDetailsModal isOpen={true} onClose={onClose} selectedTrip={mockTrip} />);
        
        fireEvent.click(screen.getByText('Approve Trip'));
        
        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(mockUpsertTrip).toHaveBeenCalledWith(expect.objectContaining({
                status: TripStatus.COMPLETED
            }));
            expect(mockAddNotification).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('does not call upsertTrip if window.confirm is false', () => {
        window.confirm = vi.fn().mockReturnValue(false);
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        fireEvent.click(screen.getByText('Approve Trip'));
        expect(mockUpsertTrip).not.toHaveBeenCalled();
    });

    it('allows ADMIN to manually change status via Select', () => {
        render(<TripDetailsModal isOpen={true} onClose={() => {}} selectedTrip={mockTrip} />);
        const select = screen.getByTestId('mock-select');
        fireEvent.change(select, { target: { value: TripStatus.CANCELLED } });
        expect(mockUpsertTrip).toHaveBeenCalledWith(expect.objectContaining({
            status: TripStatus.CANCELLED
        }));
    });
});
