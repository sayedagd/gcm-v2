import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivityLogs from '@/pages/ActivityLogs';
import { useStore } from '@/context';
import { Role, ActionType, EntityType } from '@/types';

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

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_: any, prop: string) => {
            if (typeof prop === 'symbol') return undefined;
            return React.forwardRef(({ children, ...rest }: any, ref: any) => {
                return React.createElement(prop, { ...rest, ref }, children);
            });
        }
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('date-fns', async (importOriginal) => {
    const actual: any = await importOriginal();
    return { ...actual };
});

vi.mock('@/utils/helpers', () => ({
    formatActionType: (action: string, isAr: boolean) => action,
    formatEntityType: (entity: string, isAr: boolean) => entity,
    formatRole: (role: string, isAr: boolean) => role,
    formatDate: (d: any) => '2025-06-15'
}));

const mockLogs = [
    { id: 'L-1', user_id: 'U-1', action: ActionType.CREATED, entity_type: EntityType.TRIP, entity_name: 'Trip Alpha', entity_id: 'TRP-1', details: 'Created trip', timestamp: '2025-06-15T10:00:00Z' },
    { id: 'L-2', user_id: 'U-2', action: ActionType.UPDATED, entity_type: EntityType.PROJECT, entity_name: 'Project Beta', entity_id: 'PRJ-1', details: 'Updated budget', timestamp: '2025-06-15T11:00:00Z' },
    { id: 'L-3', user_id: 'U-3', action: ActionType.DELETED, entity_type: EntityType.USER, entity_name: 'Old User', entity_id: 'U-99', details: 'Removed user', timestamp: '2025-06-15T12:00:00Z' },
];

const mockUsers = [
    { id: 'U-1', name: 'Admin Ali', role: Role.ADMIN, company_id: 'C-1' },
    { id: 'U-2', name: 'Company Bob', role: Role.COMPANY_USER, company_id: 'C-1' },
    { id: 'U-3', name: 'Client Carol', role: Role.CLIENT, company_id: 'C-2' },
];

const mockStoreAdmin = {
    logs: mockLogs,
    users: mockUsers,
    saasConfig: { language: 'en' },
    currentUser: { id: 'U-1', role: Role.ADMIN }
};

const renderComponent = () => render(
    <MemoryRouter><ActivityLogs /></MemoryRouter>
);

describe('ActivityLogs Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStoreAdmin);
    });

    it('Scenario 1: Admin sees ALL audit logs', async () => {
        renderComponent();
        expect(screen.getByText('System Audit Logs')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Trip Alpha')).toBeInTheDocument();
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
            expect(screen.getByText('Old User')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Company User sees only company member logs', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStoreAdmin,
            currentUser: { id: 'U-2', role: Role.COMPANY_USER, company_id: 'C-1' }
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Trip Alpha')).toBeInTheDocument();
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
            expect(screen.queryByText('Old User')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Client sees only their own logs', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStoreAdmin,
            currentUser: { id: 'U-3', role: Role.CLIENT, company_id: 'C-2' }
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('Old User')).toBeInTheDocument();
            expect(screen.queryByText('Trip Alpha')).not.toBeInTheDocument();
        });
    });

    it('Scenario 4: Search filtering works', async () => {
        renderComponent();
        const searchInput = screen.getByPlaceholderText('Search logs...');
        fireEvent.change(searchInput, { target: { value: 'budget' } });
        await waitFor(() => {
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
            expect(screen.queryByText('Trip Alpha')).not.toBeInTheDocument();
        });
    });

    it('Scenario 5: Empty state when no logs match', async () => {
        renderComponent();
        const searchInput = screen.getByPlaceholderText('Search logs...');
        fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });
        await waitFor(() => {
            expect(screen.getByText('No activity records found.')).toBeInTheDocument();
        });
    });
});
