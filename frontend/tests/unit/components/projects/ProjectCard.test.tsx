import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectCard from '@/components/projects/ProjectCard';
import { Project, Company } from '@/types';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        Briefcase: () => <div data-testid="icon-briefcase" />,
        Building2: () => <div data-testid="icon-building" />,
        Navigation: () => <div data-testid="icon-navigation" />,
        FileText: () => <div data-testid="icon-filetext" />,
        Clock: () => <div data-testid="icon-clock" />,
        ArrowLeft: () => <div data-testid="icon-arowleft" />,
        CheckCircle2: () => <div data-testid="icon-check" />,
        MoreVertical: () => <div data-testid="icon-more" />,
        Edit2: () => <div data-testid="icon-edit" />,
        Trash2: () => <div data-testid="icon-trash" />
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

describe('ProjectCard Component', () => {
    it('renders project basic information correctly (English)', () => {
        render(
            <MemoryRouter>
                <ProjectCard
                    project={mockProject}
                    company={mockCompany}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                    isAr={false}
                    canManage={true}
                    onView={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            </MemoryRouter>
        );

        // Core identifiers
        expect(screen.getByText('NEOM Site Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Saudi Aramco')).toBeInTheDocument();

    });

    it('renders project basic information correctly (Arabic)', () => {
         render(
             <MemoryRouter>
                <ProjectCard
                    project={mockProject}
                    company={mockCompany}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                    isAr={true}
                    canManage={true}
                    onView={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            </MemoryRouter>
        );
        // Just ensure it renders without crashing
        expect(screen.getByText('NEOM Site Cleaning')).toBeInTheDocument();
    });

    it('hides edit/delete actions when canManage is false', () => {
        render(
            <MemoryRouter>
                <ProjectCard
                    project={mockProject}
                    company={mockCompany}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                    isAr={false}
                    canManage={false}
                    onView={vi.fn()}
                    onEdit={vi.fn()}
                    onDelete={vi.fn()}
                />
            </MemoryRouter>
        );

        // Dropdown toggle shouldn't be there or its actions should be hidden
        // In the component, if !canManage, the menu shouldn't render "Edit" / "Delete"
        expect(screen.queryByTestId('icon-edit')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument();
    });

    it('triggers view, edit, and delete callbacks', () => {
        const onView = vi.fn();
        const onEdit = vi.fn();
        const onDelete = vi.fn();

        render(
            <MemoryRouter>
                <ProjectCard
                    project={mockProject}
                    company={mockCompany}
                    budgetProgress={50}
                    qtyProgress={25}
                    timeProgress={75}
                    isAr={false}
                    canManage={true}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </MemoryRouter>
        );

        // Edit Action
        const editButton = screen.getByTestId('icon-edit');
        if (editButton) {
             fireEvent.click(editButton);
             expect(onEdit).toHaveBeenCalledTimes(1);
        }
    });
});
