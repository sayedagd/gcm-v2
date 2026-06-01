/**
 * =====================================================
 * PROJECT JOURNEY (INTEGRATION TEST)
 * Target: Projects.tsx (Full Wizard Flow to Data Logging)
 * =====================================================
 * 
 * Tests the entire lifecycle of a project creation from
 * the frontend perspective, specifically addressing the
 * relationship between Services, Quantities, and Rates.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Projects from '@/pages/Projects';
import { Role } from '@/types';
import { BrowserRouter } from 'react-router-dom';

import { MantineProvider } from '@mantine/core';

// 1. Setup global mocks for the Zustand Store
const mockUpsertProject = vi.fn();
const mockUpsertProjectService = vi.fn();
const mockAddNotification = vi.fn();

vi.mock('@/context', () => ({
    useStore: () => ({
        projects: [],
        companies: [{ company_id: 'COMP-1', company_name: 'Tech Corp' }],
        services: [
            { service_id: 'CAT-1', service_name: 'General Cleaning' },
            { service_id: 'SRV-1', service_name: 'Deep Cleaning', parent_id: 'CAT-1' }
        ],
        projectServices: [],
        suppliers: [],
        trips: [],
        users: [{ id: 'U-1', name: 'Alim', email: 'alim@test.com', role: Role.PROJECT_USER }],
        saasConfig: { language: 'en', managementControlsEnabled: true },
        currentUser: { role: Role.ADMIN, user_id: 'ADM-1' },
        exportEnabled: true,
        upsertProject: mockUpsertProject,
        upsertProjectService: mockUpsertProjectService,
        deleteProject: vi.fn(),
        deleteProjectService: vi.fn(),
        addNotification: mockAddNotification
    })
}));

vi.mock('@/store/useSupplierRates', () => ({
    useSupplierRates: () => ({
        rates: [],
        addRate: vi.fn(),
        deleteRate: vi.fn()
    })
}));

// Mock framer-motion to avoid async animation sync issues
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion') as any;
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
        motion: {
            ...actual.motion,
            div: require('react').forwardRef((props: any, ref: any) => {
                const { initial, animate, exit, whileHover, whileTap, transition, variants, layout, layoutId, ...rest } = props;
                return <div ref={ref} {...rest} />;
            }),
            button: require('react').forwardRef((props: any, ref: any) => {
                const { initial, animate, exit, whileHover, whileTap, transition, variants, layout, layoutId, ...rest } = props;
                return <button ref={ref} {...rest} />;
            })
        }
    };
});

describe('Projects Page & Wizard Journey', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Scenario 1: Full Project Creation Journey', async () => {
        render(
            <MantineProvider>
                <BrowserRouter>
                    <Projects />
                </BrowserRouter>
            </MantineProvider>
        );

        // 1. Check if the page loaded
        expect(screen.getByText('Project Command Center')).toBeInTheDocument();

        // 2. Open the New Deployment (Wizard)
        const newProjectBtn = screen.getByText('New Deployment');
        fireEvent.click(newProjectBtn);
        
        await waitFor(() => {
            expect(screen.getByText('Corporate Project Wizard')).toBeInTheDocument();
        });

        // 3. Fill out Wizard Step 1 (Basic Details)
        // Project Name
        fireEvent.change(screen.getByLabelText('PROJECT NAME'), { target: { value: 'Mega Mall Cleanup' } });
        // Client Selection
        fireEvent.change(screen.getByLabelText('PARENT CLIENT'), { target: { value: 'COMP-1' } });
        // Supervisor
        fireEvent.change(screen.getByLabelText('SITE SUPERVISOR (SYSTEM)'), { target: { value: 'U-1' } });
        
        // Ensure dates are filled out to pass validation
        fireEvent.change(screen.getByLabelText('START DATE'), { target: { value: '2025-01-01' } });
        fireEvent.change(screen.getByLabelText('EXPIRY DATE'), { target: { value: '2025-12-31' } });

        // Navigate to Step 2 (Service Allocation)
        const nextButton = screen.getByText('SERVICE ALLOCATION');
        fireEvent.click(nextButton);

        // 4. Fill out Wizard Step 2 (Services, Quantity, and Rates)
        await waitFor(() => {
            expect(screen.getByText('Service Pricing')).toBeInTheDocument();
        });

        // Expand Category "General Cleaning"
        const categoryHeader = screen.getByText('General Cleaning');
        fireEvent.click(categoryHeader);

        // Add "Deep Cleaning" service
        const addButtons = screen.getAllByRole('button', { name: /Allocate/i });
        // The add button belongs to the sub-service (SRV-1)
        fireEvent.click(addButtons[0]);

        // At this point, the inputs for Qty, Supplier, and Price should appear for SRV-1
        await waitFor(() => {
            expect(screen.getByLabelText('Qty')).toBeInTheDocument();
            expect(screen.getByLabelText('Unit Price')).toBeInTheDocument();
        });

        // Test the exact bug the user mentioned: "proportionality of the quantity and price with the specified services"
        // Enter Quantity
        fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '500' } });
        // Enter Unit Price
        fireEvent.change(screen.getByLabelText('Unit Price'), { target: { value: '150' } });

        // Submit the Form (Authenticate & Save)
        const deployBtn = screen.getByText('AUTHENTICATE & SAVE');
        fireEvent.click(deployBtn);

        // 5. Verify the emitted data correctly handles the inputs!
        await waitFor(() => {
            // Verify Project object was created correctly
            expect(mockUpsertProject).toHaveBeenCalledWith(expect.objectContaining({
                project_name: 'Mega Mall Cleanup',
                company_id: 'COMP-1',
                user_id: 'U-1'
            }));

            // VERIFY THE BUG FIX: The quantity and unit price should be successfully parsed
            // and linked to the correct service_id.
            expect(mockUpsertProjectService).toHaveBeenCalledWith(expect.objectContaining({
                service_id: 'SRV-1',
                quantity: 500,        // Must be parsed as Number
                unit_price: 150       // Must be parsed as Number
            }));

            // Verify notification shown
            expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Success'
            }));
        });
    });
});
