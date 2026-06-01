/**
 * =====================================================
 * PHASE 4D — Domain Component Tests
 * Target: CompanyCard
 * =====================================================
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompanyCard from '@/components/companies/CompanyCard';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
}));

// Mock inner UI components since we already tested them
vi.mock('@/components', () => ({
    Card: ({ children, className }: any) => <div data-testid="mock-card" className={className}>{children}</div>,
    Button: ({ onClick, icon: Icon, className }: any) => (
        <button onClick={onClick} className={className} data-testid="mock-button">
            {Icon && <Icon data-testid="mock-icon" />}
        </button>
    ),
}));

describe('CompanyCard', () => {
    const mockCompany = {
        company_id: 'C1',
        company_name: 'Tech Corp',
        commercial_reg: '123456',
        vat_no: 'VAT-999',
        contact_name: 'John Doe',
        contact_phone: '555-0100',
        contact_email: 'john@tech.com',
        address: '123 Tech St',
        contract_no: 'CONT-2024',
        client_since: '2024-01-01',
        status: 'ACTIVE' as any
    };

    const mockProjects = [
        { project_id: 'P1', company_id: 'C1', project_name: 'Site A' },
        { project_id: 'P2', company_id: 'C1', project_name: 'Site B' },
        { project_id: 'P3', company_id: 'C2', project_name: 'Other' },
    ] as any[];

    const defaultProps = {
        company: mockCompany,
        projects: mockProjects,
        isAr: false,
        canManage: true,
        onView: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn()
    };

    it('renders company information correctly', () => {
        render(<CompanyCard {...defaultProps} />);
        expect(screen.getByText('Tech Corp')).toBeInTheDocument();
        expect(screen.getByText('S.A No. 123456')).toBeInTheDocument();
        expect(screen.getByText('VAT-999')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('calculates and displays correct active sites count', () => {
        render(<CompanyCard {...defaultProps} />);
        // 2 projects belong to C1
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows fallback when vat_no is missing', () => {
        render(<CompanyCard {...defaultProps} company={{ ...mockCompany, vat_no: '' }} />);
        expect(screen.getByText('---')).toBeInTheDocument();
    });

    it('renders English labels when isAr is false', () => {
        render(<CompanyCard {...defaultProps} isAr={false} />);
        expect(screen.getByText('Tax ID')).toBeInTheDocument();
        expect(screen.getByText('Active Sites')).toBeInTheDocument();
        expect(screen.getByText('Point of Contact')).toBeInTheDocument();
        expect(screen.getByText('Active License')).toBeInTheDocument();
    });

    it('renders Arabic labels when isAr is true', () => {
        render(<CompanyCard {...defaultProps} isAr={true} />);
        expect(screen.getByText('الضريبة')).toBeInTheDocument();
        expect(screen.getByText('المواقع')).toBeInTheDocument();
        expect(screen.getByText('المسؤول')).toBeInTheDocument();
        expect(screen.getByText('ترخيص نشط')).toBeInTheDocument();
    });

    it('renders manage buttons when canManage is true', () => {
        render(<CompanyCard {...defaultProps} canManage={true} />);
        // View, Edit, Phone, Delete = 4 buttons
        const buttons = screen.getAllByTestId('mock-button');
        expect(buttons).toHaveLength(4);
    });

    it('hides edit and delete buttons when canManage is false', () => {
        render(<CompanyCard {...defaultProps} canManage={false} />);
        // Only View and Phone = 2 buttons
        const buttons = screen.getAllByTestId('mock-button');
        expect(buttons).toHaveLength(2);
    });

    it('calls onView when view button clicked', () => {
        render(<CompanyCard {...defaultProps} />);
        const buttons = screen.getAllByTestId('mock-button');
        fireEvent.click(buttons[0]); // View is typically the first button
        expect(defaultProps.onView).toHaveBeenCalledTimes(1);
    });

    it('indicates active license via success class when contract_no exists', () => {
        const { container } = render(<CompanyCard {...defaultProps} company={{ ...mockCompany, contract_no: 'VALID' }} />);
        const indicator = container.querySelector('.w-2.h-2.rounded-full');
        expect(indicator).toHaveClass('bg-success');
    });

    it('indicates inactive license when contract_no is empty', () => {
        const { container } = render(<CompanyCard {...defaultProps} company={{ ...mockCompany, contract_no: '' }} />);
        const indicator = container.querySelector('.w-2.h-2.rounded-full');
        expect(indicator).toHaveClass('bg-text-subtle/30');
    });
});
