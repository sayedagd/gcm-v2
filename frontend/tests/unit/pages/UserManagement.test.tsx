import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagement from '@/pages/UserManagement';
import { useStore } from '@/context';
import { useTranslation } from '@/hooks/useTranslation';
import { Role, RequestStatus } from '@/types';

vi.mock('@/context');
vi.mock('@/hooks/useTranslation');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return new Proxy({}, {
    get: function(target, prop) {
      if (prop === '__esModule') return true;
      return MockIcon;
    }
  });
});

vi.mock('@/components/users/UserWizard', () => ({
    default: ({ isCompanyAdmin, currentUser, onSave }: any) => (
        <div data-testid="mock-wizard">
            Wizard Open
            <button onClick={() => onSave({ name: 'Test User', email: 'test@example.com', role: Role.PROJECT_USER })}>Mock Save</button>
        </div>
    )
}));

vi.mock('@/components/users/UserDetails', () => ({
    default: ({ user }: any) => <div data-testid={`mock-details-${user?.id}`}>Details Open</div>
}));

vi.mock('@/components/users/UserCard', () => ({
    default: ({ user, onView, onEdit, onDelete }: any) => (
        <div data-testid={`mock-user-card-${user.id}`}>
            {user.email}
            <button onClick={() => onView(user)}>View</button>
            <button onClick={() => onEdit(user)}>Edit</button>
            <button onClick={() => onDelete(user.id)}>Delete</button>
        </div>
    )
}));

vi.mock('@/components/users/UserStats', () => ({
    default: () => <div data-testid="mock-user-stats" />
}));

vi.mock('@/utils/excelUtils', () => ({
    exportToExcel: vi.fn(),
    importFromExcel: vi.fn().mockResolvedValue([]),
    exportTemplate: vi.fn()
}));

const mockUsers = [
    { id: 'U-1', name: 'Admin Zero', email: 'admin@gcm.com', role: Role.ADMIN, status: 'ACTIVE' },
    { id: 'U-2', name: 'Project Mgr', email: 'pm@gcm.com', role: Role.PROJECT_USER, status: 'ACTIVE', company_id: 'C-1' },
    { id: 'U-3', name: 'Client Alice', email: 'alice@client.com', role: Role.CLIENT, status: 'ACTIVE', company_id: 'C-2' },
    { id: 'U-4', name: 'Old User', email: 'old@gcm.com', role: Role.DEACTIVATED }
];

const mockRequests = [
    { id: 'REQ-1', email: 'newguy@gcm.com', role: 'PROJECT_USER', status: RequestStatus.PENDING, timestamp: new Date() }
];

const mockStoreAdmin = {
    users: mockUsers,
    permissionRequests: mockRequests,
    presenceMap: { 'U-1': { lastActive: Date.now() } },
    trips: [], companies: [], projects: [], suppliers: [],
    saasConfig: { language: 'en', managementControlsEnabled: true },
    currentUser: { id: 'U-1', role: Role.ADMIN },
    exportEnabled: true,
    addNotification: vi.fn(),
    upsertUser: vi.fn(),
    deleteUser: vi.fn(),
    updateRequestStatus: vi.fn(),
    deletePermissionRequest: vi.fn(),
    addLog: vi.fn()
};

const renderComponent = () => {
    return render(
        <MemoryRouter>
            <UserManagement />
        </MemoryRouter>
    );
};

describe('UserManagement Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStoreAdmin);
        (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
            t: (key: string) => key,
            isAr: false
        });
    });

    it('Scenario 1: Main Registry Dashboard (Admin View)', async () => {
        renderComponent();

        expect(screen.getByText('Workforce & Security Hub')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-stats')).toBeInTheDocument();
        
        // Deactivated users should be filtered out! Only 3 cards should render
        await waitFor(() => {
            expect(screen.getByTestId('mock-user-card-U-1')).toBeInTheDocument();
            expect(screen.getByTestId('mock-user-card-U-2')).toBeInTheDocument();
            expect(screen.getByTestId('mock-user-card-U-3')).toBeInTheDocument();
            expect(screen.queryByTestId('mock-user-card-U-4')).not.toBeInTheDocument(); // Deactivated!
        });
    });

    it('Scenario 2: Global Search Filtering', async () => {
        renderComponent();
        
        const searchInput = screen.getByPlaceholderText(/Search workforce registry/i);
        fireEvent.change(searchInput, { target: { value: 'alice' } });

        await waitFor(() => {
            expect(screen.getByText('alice@client.com')).toBeInTheDocument();
            expect(screen.queryByText('admin@gcm.com')).not.toBeInTheDocument();
        });
    });

    it('Scenario 3: Company Admin Scope Isolation', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStoreAdmin,
            currentUser: { id: 'U-2', role: Role.COMPANY_USER, company_id: 'C-1' }
        });
        
        renderComponent();

        // Should ONLY see users in Company C-1 (which is U-2 only)
        await waitFor(() => {
            expect(screen.getByText('pm@gcm.com')).toBeInTheDocument();
            expect(screen.queryByText('alice@client.com')).not.toBeInTheDocument();
            expect(screen.queryByText('admin@gcm.com')).not.toBeInTheDocument();
        });
    });

    it('Scenario 4: Handling Access Requests (Admin Only)', async () => {
        renderComponent();

        const requestsTab = screen.getByRole('button', { name: /Access Log/i });
        fireEvent.click(requestsTab);

        await waitFor(() => {
            expect(screen.getByText('newguy@gcm.com')).toBeInTheDocument();
        });

        const provisionBtn = screen.getByRole('button', { name: /Provision/i });
        fireEvent.click(provisionBtn);

        await waitFor(() => {
            expect(screen.getByText('Account Provisioning Protocol')).toBeInTheDocument();
            expect(screen.getByText('PROVISION & NOTIFY')).toBeInTheDocument();
        });

        // Click final provision
        fireEvent.click(screen.getByText('PROVISION & NOTIFY'));

        expect(mockStoreAdmin.upsertUser).toHaveBeenCalledWith(expect.objectContaining({
            email: 'newguy@gcm.com'
        }));
        expect(mockStoreAdmin.updateRequestStatus).toHaveBeenCalledWith('REQ-1', RequestStatus.APPROVED);
    });

    it('Scenario 5: Denying Access Request', async () => {
        window.alert = vi.fn();
        renderComponent();

        const requestsTab = screen.getByRole('button', { name: /Access Log/i });
        fireEvent.click(requestsTab);

        await waitFor(() => {
            expect(screen.getByText('newguy@gcm.com')).toBeInTheDocument();
        });

        const denyBtn = screen.getByRole('button', { name: /Deny/i });
        fireEvent.click(denyBtn);

        expect(mockStoreAdmin.updateRequestStatus).toHaveBeenCalledWith('REQ-1', RequestStatus.REJECTED);
    });

    it('Scenario 6: Invite Member Wizard', async () => {
        renderComponent();

        const inviteBtn = screen.getByRole('button', { name: /Invite Member/i });
        fireEvent.click(inviteBtn);

        await waitFor(() => {
            expect(screen.getByTestId('mock-wizard')).toBeInTheDocument();
        });

        const saveBtn = screen.getByText('Mock Save');
        fireEvent.click(saveBtn);
        
        expect(mockStoreAdmin.upsertUser).toHaveBeenCalled();
    });
});
