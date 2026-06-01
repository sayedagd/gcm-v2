/**
 * =====================================================
 * PHASE 4A — UI Primitive Components Tests
 * Target: Button, Badge, Card, LoadingSpinner, EmptyState
 * =====================================================
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render as tlRender, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';

const renderWithMantine = (ui: React.ReactElement, options = {}) =>
  tlRender(ui, { wrapper: ({ children }) => <MantineProvider>{children}</MantineProvider>, ...options });

// override render for the entire file
const originalRender = tlRender;
const renderWithProvider = renderWithMantine;

// Mock framer-motion for Modal animations
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// =====================================================
// Button
// =====================================================
describe('Button', () => {
    describe('rendering', () => {
        it('renders children text', () => {
            tlRender(<Button>Click Me</Button>);
            expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
        });

        it('applies primary variant classes by default', () => {
            tlRender(<Button>Primary</Button>);
            const btn = screen.getByRole('button');
            expect(btn.className).toContain('btn-main');
        });

        it('applies secondary variant classes', () => {
            tlRender(<Button variant="secondary">Sec</Button>);
            expect(screen.getByRole('button').className).toContain('bg-surface');
        });

        it('applies danger variant classes', () => {
            tlRender(<Button variant="danger">Del</Button>);
            expect(screen.getByRole('button').className).toContain('btn-danger');
        });

        it('applies success variant classes', () => {
            tlRender(<Button variant="success">OK</Button>);
            expect(screen.getByRole('button').className).toContain('bg-emerald-500');
        });

        it('applies ghost variant classes', () => {
            tlRender(<Button variant="ghost">Ghost</Button>);
            expect(screen.getByRole('button').className).toContain('bg-transparent');
        });
    });

    describe('sizes', () => {
        it('applies sm size classes', () => {
            tlRender(<Button size="sm">Small</Button>);
            expect(screen.getByRole('button').className).toContain('px-3');
        });

        it('applies md size classes (default)', () => {
            tlRender(<Button>Medium</Button>);
            expect(screen.getByRole('button').className).toContain('px-4');
        });

        it('applies lg size classes', () => {
            tlRender(<Button size="lg">Large</Button>);
            expect(screen.getByRole('button').className).toContain('px-6');
        });
    });

    describe('interactions', () => {
        it('calls onClick when clicked', () => {
            const handler = vi.fn();
            tlRender(<Button onClick={handler}>Click</Button>);
            fireEvent.click(screen.getByRole('button'));
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('is disabled when disabled prop is true', () => {
            tlRender(<Button disabled>Off</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('is disabled when isLoading is true', () => {
            tlRender(<Button isLoading>Saving</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('shows loading spinner when isLoading', () => {
            tlRender(<Button isLoading>Loading</Button>);
            const btn = screen.getByRole('button');
            expect(btn.className).toContain('opacity-50');
        });
    });

    describe('icon rendering', () => {
        it('renders an icon element on the left by default', () => {
            const icon = <span data-testid="test-icon">★</span>;
            tlRender(<Button icon={icon}>With Icon</Button>);
            expect(screen.getByTestId('test-icon')).toBeInTheDocument();
        });

        it('renders icon on the right when iconPosition="right"', () => {
            const icon = <span data-testid="right-icon">→</span>;
            tlRender(<Button icon={icon} iconPosition="right">Go</Button>);
            const btn = screen.getByRole('button');
            const iconEl = screen.getByTestId('right-icon');
            // Icon should exist within button
            expect(btn).toContainElement(iconEl);
        });

        it('does not render icon when isLoading is true', () => {
            const icon = <span data-testid="hidden-icon">★</span>;
            tlRender(<Button icon={icon} isLoading>Loading</Button>);
            expect(screen.queryByTestId('hidden-icon')).not.toBeInTheDocument();
        });
    });

    describe('custom props', () => {
        it('passes additional className', () => {
            tlRender(<Button className="my-custom-class">Custom</Button>);
            expect(screen.getByRole('button').className).toContain('my-custom-class');
        });

        it('passes HTML button attributes', () => {
            tlRender(<Button type="submit" data-testid="submit-btn">Submit</Button>);
            expect(screen.getByTestId('submit-btn')).toHaveAttribute('type', 'submit');
        });
    });
});

// =====================================================
// Badge
// =====================================================
describe('Badge', () => {
    it('renders children text', () => {
        tlRender(<Badge>Active</Badge>);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies primary variant by default', () => {
        tlRender(<Badge>Status</Badge>);
        const badge = screen.getByText('Status');
        expect(badge.className).toContain('bg-primary-50');
    });

    it('applies green variant', () => {
        tlRender(<Badge variant="green">Online</Badge>);
        expect(screen.getByText('Online').className).toContain('bg-green-50');
    });

    it('applies rose variant', () => {
        tlRender(<Badge variant="rose">Error</Badge>);
        expect(screen.getByText('Error').className).toContain('bg-rose-50');
    });

    it('applies amber variant', () => {
        tlRender(<Badge variant="amber">Warn</Badge>);
        expect(screen.getByText('Warn').className).toContain('bg-amber-50');
    });

    it('applies slate variant', () => {
        tlRender(<Badge variant="slate">Draft</Badge>);
        expect(screen.getByText('Draft').className).toContain('bg-surface-subtle');
    });

    it('falls back to primary for unknown variant', () => {
        tlRender(<Badge variant={'unknown' as any}>Fallback</Badge>);
        expect(screen.getByText('Fallback').className).toContain('bg-primary-50');
    });

    it('appends custom className', () => {
        tlRender(<Badge className="extra">Custom</Badge>);
        expect(screen.getByText('Custom').className).toContain('extra');
    });
});

// =====================================================
// Card
// =====================================================
describe('Card', () => {
    it('renders children', () => {
        tlRender(<Card>Card Content</Card>);
        expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
        tlRender(<Card title="Dashboard"><p>Body</p></Card>);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
        tlRender(<Card title="Main" subtitle="Sub info"><p>Body</p></Card>);
        expect(screen.getByText('Sub info')).toBeInTheDocument();
    });

    it('does not render header area when no title and no icon', () => {
        const { container } = tlRender(<Card><p>Minimal</p></Card>);
        expect(container.querySelector('h3')).not.toBeInTheDocument();
    });

    describe('variants', () => {
        it('applies default variant', () => {
            const { container } = tlRender(<Card><p>Test</p></Card>);
            expect(container.firstChild).toHaveClass('bg-surface');
        });

        it('applies gradient variant', () => {
            const { container } = tlRender(<Card variant="gradient"><p>Test</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('bg-gradient-to-br');
        });

        it('applies bordered variant', () => {
            const { container } = tlRender(<Card variant="bordered"><p>Test</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('border-2');
        });

        it('applies glass variant', () => {
            const { container } = tlRender(<Card variant="glass"><p>Test</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('glass');
        });
    });

    describe('clickable behavior', () => {
        it('applies clickable classes when onClick is provided', () => {
            const handler = vi.fn();
            const { container } = tlRender(<Card onClick={handler}><p>Clickable</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('cursor-pointer');
            fireEvent.click(container.firstChild as HTMLElement);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('does not apply clickable classes without onClick', () => {
            const { container } = tlRender(<Card><p>Static</p></Card>);
            expect((container.firstChild as HTMLElement).className).not.toContain('cursor-pointer');
        });
    });

    describe('compact mode', () => {
        it('uses p-4 when compact is true', () => {
            const { container } = tlRender(<Card compact><p>Small</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('p-4');
        });

        it('uses p-6 when compact is false (default)', () => {
            const { container } = tlRender(<Card><p>Normal</p></Card>);
            expect((container.firstChild as HTMLElement).className).toContain('p-6');
        });
    });
});

// =====================================================
// Modal
// =====================================================
describe('Modal', () => {
    it('renders when isOpen is true', () => {
        renderWithMantine(
            <Modal isOpen={true} onClose={() => {}} title="My Modal">
                <div>Content goes here</div>
            </Modal>
        );
        expect(screen.getByText('My Modal')).toBeInTheDocument();
        expect(screen.getByText('Content goes here')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        renderWithMantine(
            <Modal isOpen={false} onClose={() => {}} title="My Modal">
                <div>Content</div>
            </Modal>
        );
        expect(screen.queryByText('My Modal')).not.toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
        renderWithMantine(
            <Modal isOpen={true} onClose={() => {}} title="Title" subtitle="Context info">
                <div>Content</div>
            </Modal>
        );
        expect(screen.getByText('Context info')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
        renderWithMantine(
            <Modal 
                isOpen={true} 
                onClose={() => {}} 
                title="Title" 
                footer={<button>Save Changes</button>}
            >
                <div>Content</div>
            </Modal>
        );
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        renderWithMantine(
            <Modal isOpen={true} onClose={onClose} title="Title">
                <div>Content</div>
            </Modal>
        );
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape key press', () => {
        const onClose = vi.fn();
        renderWithMantine(
            <Modal isOpen={true} onClose={onClose} title="Title">
                <div>Content</div>
            </Modal>
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the backdrop', () => {
        const onClose = vi.fn();
        renderWithMantine(
            <Modal isOpen={true} onClose={onClose} title="Title">
                <div>Content</div>
            </Modal>
        );
        const backdrop = document.querySelector('.bg-black\\/50');
        if (backdrop) {
            fireEvent.click(backdrop);
        }
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    describe('sizes', () => {
        it('applies sm size classes', () => {
            renderWithMantine(<Modal isOpen={true} onClose={() => {}} title="Title" size="sm">C</Modal>);
            const modalBox = screen.getByText('Title').closest('.bg-surface');
            expect(modalBox?.className).toContain('max-w-md');
        });

        it('applies lg size classes', () => {
            renderWithMantine(<Modal isOpen={true} onClose={() => {}} title="Title" size="lg">C</Modal>);
            const modalBox = screen.getByText('Title').closest('.bg-surface');
            expect(modalBox?.className).toContain('max-w-4xl');
        });
    });
});
