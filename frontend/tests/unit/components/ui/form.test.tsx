/**
 * =====================================================
 * PHASE 4C — Form Primitive Components Tests
 * Target: Input, Textarea, Select, SmartDropdown
 * =====================================================
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Mail, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import SmartDropdown from '@/components/ui/SmartDropdown';

// Mock framer-motion as it's used for error message animation
vi.mock('framer-motion', () => ({
    motion: {
        p: React.forwardRef(({ children, ...props }: any, ref: any) => <p ref={ref} {...props}>{children}</p>),
    },
}));

// =====================================================
// Input
// =====================================================
describe('Input', () => {
    it('renders correctly with base props', () => {
        const onChange = vi.fn();
        render(<Input value="" onChange={onChange} placeholder="Enter name" />);
        expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
    });

    it('renders label and required asterisk', () => {
        render(<Input value="" onChange={() => {}} label="Email" required />);
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('*')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('calls onChange when typing', () => {
        const onChange = vi.fn();
        render(<Input value="" onChange={onChange} placeholder="Type" />);
        const input = screen.getByPlaceholderText('Type');
        fireEvent.change(input, { target: { value: 'Hello' } });
        expect(onChange).toHaveBeenCalledWith('Hello');
    });

    it('displays error message and applies danger classes', () => {
        render(<Input value="" onChange={() => {}} error="Invalid email" />);
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input.className).toContain('border-danger');
    });

    it('displays helper text when no error exists', () => {
        render(<Input value="" onChange={() => {}} helperText="Must be 8+ chars" />);
        expect(screen.getByText('Must be 8+ chars')).toBeInTheDocument();
    });

    it('hides helper text when error exists', () => {
        render(<Input value="" onChange={() => {}} helperText="Must be 8+ chars" error="Too short" />);
        expect(screen.getByText('Too short')).toBeInTheDocument();
        expect(screen.queryByText('Must be 8+ chars')).not.toBeInTheDocument();
    });

    it('renders icon and applies padding', () => {
        render(<Input value="" onChange={() => {}} icon={Mail} data-testid="input-with-icon" />);
        const input = screen.getByTestId('input-with-icon');
        expect(input.className).toContain('ps-10'); // Icon padding
    });

    it('renders suffix', () => {
        render(<Input value="" onChange={() => {}} suffix={<span data-testid="suffix">%</span>} />);
        expect(screen.getByTestId('suffix')).toBeInTheDocument();
    });
});

// =====================================================
// Textarea
// =====================================================
describe('Textarea', () => {
    it('renders label and handles input', () => {
        const onChange = vi.fn();
        render(<Textarea value="" onChange={onChange} label="Notes" placeholder="Start typing" />);
        expect(screen.getByText('Notes')).toBeInTheDocument();
        const textarea = screen.getByPlaceholderText('Start typing');
        fireEvent.change(textarea, { target: { value: 'Test note' } });
        expect(onChange).toHaveBeenCalledWith('Test note');
    });

    it('displays character count when showCharCount is true', () => {
        render(
            <Textarea 
                value="Hello" 
                onChange={() => {}} 
                maxLength={100} 
                showCharCount 
            />
        );
        expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('applies error styling text when over maxLength (simulated by value length)', () => {
        render(
            <Textarea 
                value="123456" 
                onChange={() => {}} 
                maxLength={5} 
                showCharCount 
            />
        );
        const counter = screen.getByText('6/5');
        expect(counter.className).toContain('text-rose-500');
    });

    it('displays error message', () => {
        render(<Textarea value="" onChange={() => {}} error="Required field" />);
        expect(screen.getByText('Required field')).toBeInTheDocument();
        const textarea = screen.getByRole('textbox');
        expect(textarea.className).toContain('border-rose-400');
    });
});

// =====================================================
// Select
// =====================================================
describe('Select', () => {
    const options = [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' }
    ];

    it('renders label, placeholder, and options', () => {
        const onChange = vi.fn();
        render(
            <Select 
                value="" 
                onChange={onChange} 
                label="Pick One" 
                placeholder="Select an option" 
                options={options} 
            />
        );
        expect(screen.getByText('Pick One')).toBeInTheDocument();
        // Placeholder becomes a disabled option
        expect(screen.getByRole('option', { name: 'Select an option' })).toBeDisabled();
        expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
    });

    it('calls onChange with selected value', () => {
        const onChange = vi.fn();
        render(<Select value="" onChange={onChange} options={options} data-testid="select" />);
        const selectBox = screen.getByTestId('select');
        fireEvent.change(selectBox, { target: { value: 'b' } });
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('displays error message', () => {
        render(<Select value="" onChange={() => {}} options={options} error="Please select" />);
        expect(screen.getByText('Please select')).toBeInTheDocument();
        const selectBox = screen.getByRole('combobox');
        expect(selectBox.className).toContain('border-danger');
    });
});

// =====================================================
// SmartDropdown
// =====================================================
describe('SmartDropdown', () => {
    const mockData = [
        { id: 1, name: 'Item One' },
        { id: 2, name: 'Item Two' },
        { id: 3, name: 'Apple' },
    ];

    it('renders title initially when no selection is made', () => {
        render(
            <SmartDropdown 
                title="Filter by Items" 
                icon={Search} 
                data={mockData} 
                selected={null} 
                onSelect={() => {}} 
                isAr={false} 
            />
        );
        expect(screen.getByRole('button')).toHaveTextContent('Filter by Items');
    });

    it('renders selected item name when selected is provided', () => {
        render(
            <SmartDropdown 
                title="Filter by Items" 
                icon={Search} 
                data={mockData} 
                selected={2} 
                onSelect={() => {}} 
                isAr={false} 
            />
        );
        expect(screen.getByRole('button')).toHaveTextContent('Item Two');
    });

    it('opens portal with options when clicked', async () => {
        render(
            <SmartDropdown 
                title="Filter by Items" 
                icon={Search} 
                data={mockData} 
                selected={null} 
                onSelect={() => {}} 
                isAr={false} 
            />
        );
        const button = screen.getByRole('button');
        fireEvent.click(button);

        // We should see the items appearing in the portal
        await waitFor(() => {
            expect(screen.getByText('Item One')).toBeInTheDocument();
            expect(screen.getByText('Item Two')).toBeInTheDocument();
        });
    });

    it('filters items when typing in sub-search', async () => {
        render(
            <SmartDropdown 
                title="Filter" 
                icon={Search} 
                data={mockData} 
                selected={null} 
                onSelect={() => {}} 
                isAr={false} 
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Filter/i }));

        await waitFor(() => expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument());
        
        const searchInput = screen.getByPlaceholderText('Search...');
        fireEvent.change(searchInput, { target: { value: 'App' } });

        expect(screen.queryByText('Item One')).not.toBeInTheDocument();
        expect(screen.queryByText('Item Two')).not.toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('calls onSelect and closes when an item is clicked', async () => {
        const onSelect = vi.fn();
        render(
            <SmartDropdown 
                title="Filter" 
                icon={Search} 
                data={mockData} 
                selected={null} 
                onSelect={onSelect} 
                isAr={false} 
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Filter/i }));

        await waitFor(() => expect(screen.getByText('Item One')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('Item One'));
        expect(onSelect).toHaveBeenCalledWith(1);
        
        // After selecting, the dropdown should close
        await waitFor(() => expect(screen.queryByText('Item One')).not.toBeInTheDocument());
    });

    it('calls onSelect with null when clicking "All"', async () => {
        const onSelect = vi.fn();
        render(
            <SmartDropdown 
                title="Filter" 
                icon={Search} 
                data={mockData} 
                selected={2} 
                onSelect={onSelect} 
                isAr={false} 
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Item Two/i }));

        await waitFor(() => expect(screen.getByText('All')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('All'));
        expect(onSelect).toHaveBeenCalledWith(null);
    });
});
