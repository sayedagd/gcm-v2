import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profile from '@/pages/Profile';
import { useStore } from '@/context';
import { Role } from '@/types';

vi.mock('@/context');

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
    ChevronUp: MockIcon, Download: MockIcon, Check: MockIcon, Circle: MockIcon, Loader2: MockIcon,
    LayoutGrid: MockIcon, List: MockIcon, Zap: MockIcon, ShieldCheck: MockIcon, DollarSign: MockIcon,
    HelpCircle: MockIcon, User: MockIcon, Key: MockIcon, Clock: MockIcon, Edit3: MockIcon,
    Shield: MockIcon, Map: MockIcon, ShieldAlert: MockIcon, PlusCircle: MockIcon, LogIn: MockIcon,
    LogOut: MockIcon, Database: MockIcon, ScrollText: MockIcon, Info: MockIcon, Camera: MockIcon,
    Home: MockIcon, Globe: MockIcon, UserPlus: MockIcon, Save: MockIcon, BarChart2: MockIcon,
    PieChart: MockIcon, TrendingUp: MockIcon, FileSpreadsheet: MockIcon, Wrench: MockIcon,
    Mail: MockIcon
  };
});

const mockLogs = [
    { id: 'L-1', user_id: 'U-1', action: 'CREATED', entity_type: 'TRIP', entity_name: 'Trip 1', details: 'Created trip', timestamp: '2025-06-15T10:00:00Z' },
    { id: 'L-2', user_id: 'U-1', action: 'UPDATED', entity_type: 'PROJECT', entity_name: 'Project X', details: 'Updated budget', timestamp: '2025-06-15T11:00:00Z' },
    { id: 'L-3', user_id: 'U-2', action: 'DELETED', entity_type: 'USER', entity_name: 'Old User', details: 'Removed', timestamp: '2025-06-15T12:00:00Z' },
];

const mockStore = {
    currentUser: { id: 'U-1', name: 'John Admin', email: 'john@gcm.com', role: Role.ADMIN, avatar: 'https://example.com/avatar.png' },
    logs: mockLogs,
    saasConfig: { language: 'en' },
    upsertUser: vi.fn()
};

const renderComponent = () => render(<MemoryRouter><Profile /></MemoryRouter>);

describe('Profile Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('Scenario 1: Renders user profile info', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('John Admin')).toBeInTheDocument();
            expect(screen.getByText('john@gcm.com')).toBeInTheDocument();
            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Shows only current user logs', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Trip 1')).toBeInTheDocument();
            expect(screen.getByText('Project X')).toBeInTheDocument();
            expect(screen.queryByText('Old User')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Edit mode toggle', async () => {
        renderComponent();
        fireEvent.click(screen.getByText('Edit Profile'));
        await waitFor(() => {
            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByDisplayValue('John Admin')).toBeInTheDocument();
        });
    });

    it('Scenario 4: Save calls upsertUser', async () => {
        renderComponent();
        fireEvent.click(screen.getByText('Edit Profile'));
        fireEvent.change(screen.getByDisplayValue('John Admin'), { target: { value: 'John Updated' } });
        fireEvent.click(screen.getByText('Save'));
        await waitFor(() => {
            expect(mockStore.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'John Updated' }));
        });
    });

    it('Scenario 5: Empty activity state', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ ...mockStore, logs: [] });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('No activity logs recorded yet.')).toBeInTheDocument();
        });
    });
});
