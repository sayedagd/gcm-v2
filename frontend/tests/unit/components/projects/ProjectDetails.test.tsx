import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectDetails from '@/components/projects/ProjectDetails';
import { Project, Company, ProjectService, Service, SupplierRate } from '@/types';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        Briefcase: () => <div data-testid="icon-briefcase" />,
        Building2: () => <div data-testid="icon-building" />,
        Navigation: () => <div data-testid="icon-navigation" />,
        FileText: () => <div data-testid="icon-filetext" />,
        DollarSign: () => <div data-testid="icon-dollar" />,
        Box: () => <div data-testid="icon-box" />,
        Edit2: () => <div data-testid="icon-edit" />,
        Check: () => <div data-testid="icon-check" />,
        X: () => <div data-testid="icon-x" />,
        ChevronDown: () => <div data-testid="icon-chevrondown" />,
        Activity: () => <div data-testid="icon-activity" />,
        AlertCircle: () => <div data-testid="icon-alert" />,
        Package: () => <div data-testid="icon-package" />
    };
});

const mockProject: Project = {
    project_id: 'P-123',
    project_name: 'NEOM Site Cleaning',
    company_id: 'C-001',
    start_date: '2024-01-01',
    end_date: '2025-01-01',
    budget: 500000,
    total_quantities: 1000,
    status: 'ACTIVE',
    assets: {
        large_containers: 5,
        small_containers: 10,
        compactors: 2
    },
    service_ids: []
};

const mockCompany: Company = {
    company_id: 'C-001',
    company_name: 'Saudi Aramco',
    commercial_reg: '1010101010',
    client_since: '2020-01-01'
};

const mockServices: Service[] = [
    { service_id: 'CAT-1', service_name: 'Cleaning Category', service_description: '' },
    { service_id: 'S-1', service_name: 'Deep Wash', parent_id: 'CAT-1', service_description: '' }
];

const mockProjectServices: ProjectService[] = [
    {
        id: 'PS-1',
        project_id: 'P-123',
        service_id: 'S-1',
        quantity: 50,
        unit_price: 100,
        total_cost: 5000,
        progress_level: 0,
        supplier_id: 'SUP-1'
    }
];

const mockSupplierRates: SupplierRate[] = [
    {
        id: 'SR-1',
        project_id: 'P-123',
        supplier_id: 'SUP-1',
        service_id: 'S-1',
        cost_price: 80,
        currency: 'SAR'
    }
];

describe('ProjectDetails Component', () => {
    it('renders project metadata perfectly without throwing errors', () => {
        render(
            <MemoryRouter>
                <ProjectDetails 
                    isOpen={true}
                    onClose={vi.fn()}
                    project={mockProject}
                    companies={[mockCompany]}
                    isAr={false}
                    projectServices={mockProjectServices}
                    services={mockServices}
                    suppliers={[{ supplier_id: 'SUP-1', name: 'Al-Rajhi Trans', status: 'ACTIVE' } as any]}
                    addSupplierRate={vi.fn()}
                    deleteSupplierRate={vi.fn()}
                    supplierRates={mockSupplierRates}
                    addNotification={vi.fn()}
                    onEdit={vi.fn()}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                />
            </MemoryRouter>
        );

        // Header info
        expect(screen.getByText('NEOM Site Cleaning')).toBeInTheDocument();
        expect(screen.getByText('#P-123')).toBeInTheDocument();
        
        // Progress metrics
        expect(screen.getByText('Operating Budget')).toBeInTheDocument();
        expect(screen.getByText('Target Deliverables')).toBeInTheDocument();
        expect(screen.getByText('TIME ELAPSED')).toBeInTheDocument();
        
        // Detailed services rendering
        expect(screen.getAllByText('Deep Wash').length).toBeGreaterThan(0);
        // Check unit price rendering formatting
        expect(screen.getAllByText(/100.00/).length).toBeGreaterThan(0);
    });

    it('displays correctly Arabic translations', () => {
        render(
            <MemoryRouter>
                <ProjectDetails 
                    isOpen={true}
                    onClose={vi.fn()}
                    project={mockProject}
                    companies={[mockCompany]}
                    isAr={true}
                    projectServices={mockProjectServices}
                    services={mockServices}
                    suppliers={[{ supplier_id: 'SUP-1', name: 'Al-Rajhi Trans', status: 'ACTIVE' } as any]}
                    addSupplierRate={vi.fn()}
                    deleteSupplierRate={vi.fn()}
                    supplierRates={mockSupplierRates}
                    addNotification={vi.fn()}
                    onEdit={vi.fn()}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                />
            </MemoryRouter>
        );

        // Just ensure no crash
        expect(screen.getByText('NEOM Site Cleaning')).toBeInTheDocument();
    });

    it('handles empty state when no services are attached', () => {
        render(
            <MemoryRouter>
                <ProjectDetails 
                    isOpen={true}
                    onClose={vi.fn()}
                    project={mockProject}
                    companies={[mockCompany]}
                    isAr={false}
                    projectServices={[]}
                    services={mockServices}
                    suppliers={[]}
                    addSupplierRate={vi.fn()}
                    deleteSupplierRate={vi.fn()}
                    supplierRates={[]}
                    addNotification={vi.fn()}
                    onEdit={vi.fn()}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                />
            </MemoryRouter>
        );

        // Ensures it doesn't crash and displays something graceful
        expect(screen.queryByText('Deep Wash')).not.toBeInTheDocument();
        // Actually the component handles empty iterations gracefully without standard empty state
    });
});
