/**
 * =====================================================
 * PHASE 4B — Common Component Tests
 * Target: LoadingSpinner, EmptyState, DeleteConfirmModal
 * =====================================================
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render as tlRender, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

const render = (ui: React.ReactElement, options = {}) =>
  tlRender(ui, { wrapper: ({ children }) => <MantineProvider>{children}</MantineProvider>, ...options });

// We need to mock framer-motion and the components barrel for DeleteConfirmModal
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components', async (importOriginal) => {
    const mod = await importOriginal() as any;
    return {
        ...mod,
        // Modal and Button are needed for DeleteConfirmModal
        // They are already simple enough to use as-is from the real module
    };
});

// =====================================================
// LoadingSpinner
// =====================================================
describe('LoadingSpinner', () => {
    it('renders without a message by default', () => {
        const { container } = render(<LoadingSpinner />);
        expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('renders a message when provided', () => {
        render(<LoadingSpinner message="Loading data..." />);
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    describe('size variants', () => {
        it('applies sm size classes', () => {
            const { container } = render(<LoadingSpinner size="sm" />);
            const spinner = container.querySelector('.rounded-full');
            expect(spinner?.className).toContain('w-6');
        });

        it('applies md size classes (default)', () => {
            const { container } = render(<LoadingSpinner />);
            const spinner = container.querySelector('.rounded-full');
            expect(spinner?.className).toContain('w-12');
        });

        it('applies lg size classes', () => {
            const { container } = render(<LoadingSpinner size="lg" />);
            const spinner = container.querySelector('.rounded-full');
            expect(spinner?.className).toContain('w-16');
        });
    });

    it('has spin animation class', () => {
        const { container } = render(<LoadingSpinner />);
        const spinner = container.querySelector('.rounded-full');
        expect(spinner?.className).toContain('animate-spin');
    });
});

// =====================================================
// EmptyState
// =====================================================
describe('EmptyState', () => {
    it('renders title', () => {
        render(<EmptyState title="No Data Found" />);
        expect(screen.getByText('No Data Found')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(<EmptyState title="Empty" description="No records to display" />);
        expect(screen.getByText('No records to display')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
        const { container } = render(<EmptyState title="Empty" />);
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs).toHaveLength(0);
    });

    it('renders action button when provided', () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                title="No Items"
                action={{ label: 'Add New', onClick }}
            />
        );
        const btn = screen.getByText('Add New');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when not provided', () => {
        const { container } = render(<EmptyState title="Empty" />);
        expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    it('renders a default icon when none provided', () => {
        const { container } = render(<EmptyState title="Empty" />);
        // Default icon container should exist
        const iconWrapper = container.querySelector('.w-16.h-16');
        expect(iconWrapper).toBeInTheDocument();
    });

    it('renders a custom icon element when provided', () => {
        const icon = <span data-testid="custom-icon">📭</span>;
        render(<EmptyState title="Empty" icon={icon} />);
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
});

// =====================================================
// DeleteConfirmModal
// =====================================================
describe('DeleteConfirmModal', () => {
    it('renders when isOpen is true', () => {
        render(
            <DeleteConfirmModal 
                isOpen={true} 
                onClose={() => {}} 
                onConfirm={() => {}} 
                title="Delete User" 
                message="Are you sure?" 
            />
        );
        expect(screen.getByText('Delete User')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(
            <DeleteConfirmModal 
                isOpen={false} 
                onClose={() => {}} 
                onConfirm={() => {}} 
                title="Delete User" 
                message="Are you sure?" 
            />
        );
        expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });

    it('renders itemName if provided', () => {
        render(
            <DeleteConfirmModal 
                isOpen={true} 
                onClose={() => {}} 
                onConfirm={() => {}} 
                title="Delete" 
                message="Are you sure?" 
                itemName="John Doe"
            />
        );
        expect(screen.getByText(/"John Doe"/i)).toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
        const onClose = vi.fn();
        render(
            <DeleteConfirmModal 
                isOpen={true} 
                onClose={onClose} 
                onConfirm={() => {}} 
                title="Delete" 
                message="Are you sure?" 
            />
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when confirm button is clicked', () => {
        const onConfirm = vi.fn();
        render(
            <DeleteConfirmModal 
                isOpen={true} 
                onClose={() => {}} 
                onConfirm={onConfirm} 
                title="Delete" 
                message="Are you sure?" 
            />
        );
        fireEvent.click(screen.getByText('Confirm Delete'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
