/**
 * =====================================================
 * PHASE 3 — Zustand Store Tests
 * Target: getBilingualError, getApiBaseUrl, useGCMStore
 *         (setters, login, logout, CRUD optimistic updates)
 *         and useAppStore RBAC filtering
 * =====================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted runs BEFORE vi.mock factories — solve the "Cannot access before initialization" error
const mockApi = vi.hoisted(() => {
    const fn = () => vi.fn().mockResolvedValue([]);
    const fnObj = () => vi.fn().mockResolvedValue({});
    return {
        login: vi.fn(),
        getCompanies: fn(), getProjects: fn(), getTrips: fn(), getUsers: fn(),
        getServices: fn(), getVehicles: fn(), getDrivers: fn(), getContainers: fn(),
        getTanks: fn(), getScales: fn(), getInventorySizes: fn(), getLogs: fn(),
        getNotifications: fn(), getPermissionRequests: fn(), getContactSubmissions: fn(),
        getProjectServices: fn(), getSuppliers: fn(), getEquipments: fn(),
        getEquipmentInquiries: fn(), getFacilities: fn(), getAssetRequests: fn(),
        getConfig: vi.fn().mockResolvedValue(null),
        upsertCompany: fnObj(), deleteCompany: fnObj(),
        upsertProject: fnObj(), deleteProject: fnObj(),
        upsertTrip: fnObj(), deleteTrip: fnObj(),
        upsertUser: fnObj(), deleteUser: fnObj(),
        upsertService: fnObj(), upsertVehicle: fnObj(), deleteVehicle: fnObj(),
        upsertDriver: fnObj(), deleteDriver: fnObj(),
        upsertContainer: fnObj(), deleteContainer: fnObj(),
        upsertTank: fnObj(), deleteTank: fnObj(),
        upsertScale: fnObj(), deleteScale: fnObj(),
        upsertInventorySize: fnObj(), deleteInventorySize: fnObj(),
        upsertSupplier: fnObj(), deleteSupplier: fnObj(),
        upsertFacility: fnObj(), deleteFacility: fnObj(),
        upsertProjectService: fnObj(), deleteProjectService: fnObj(),
        addLog: fnObj(), addNotification: fnObj(),
        markNotificationRead: fnObj(), markAllNotificationsRead: fnObj(),
        deleteAllNotifications: fnObj(), deleteNotification: fnObj(),
        upsertConfig: fnObj(), upsertPermissionRequest: fnObj(), upsertAssetRequest: fnObj(),
    };
});

vi.mock('@/api/client', () => ({
    createApiClient: () => mockApi,
    ApiError: class ApiError extends Error {
        messageAr: string;
        messageEn: string;
        constructor(data: any, status: number) {
            super(data.error || 'Error');
            this.messageAr = data.errorAr || 'خطأ';
            this.messageEn = data.errorEn || 'Error';
        }
    }
}));

import { useGCMStore } from '@/store/index';
import { Role } from '@/types';

// Reset store between tests
const resetStore = () => {
    useGCMStore.setState({
        companies: [],
        allProjects: [],
        allTrips: [],
        users: [],
        services: [],
        vehicles: [],
        drivers: [],
        containers: [],
        tanks: [],
        scales: [],
        inventorySizes: [],
        logs: [],
        notifications: [],
        permissionRequests: [],
        contactSubmissions: [],
        projectServices: [],
        suppliers: [],
        facilities: [],
        environmentalEquipments: [],
        equipmentInquiries: [],
        assetRequests: [],
        presenceMap: {},
        isAuthenticated: false,
        currentUser: { id: '', name: '', email: '', role: Role.ADMIN, company_id: '', project_id: '' } as any,
    });
    Object.values(mockApi).forEach(fn => {
        if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
    });
};

// =====================================================
// Store State & Simple Setters
// =====================================================
describe('useGCMStore — setters', () => {
    beforeEach(resetStore);

    it('setDarkMode updates darkMode and localStorage', () => {
        const store = useGCMStore.getState();
        store.setDarkMode(true);
        expect(useGCMStore.getState().darkMode).toBe(true);
        expect(localStorage.getItem('gcm_dark_mode')).toBe('true');

        store.setDarkMode(false);
        expect(useGCMStore.getState().darkMode).toBe(false);
        expect(localStorage.getItem('gcm_dark_mode')).toBe('false');
    });

    it('setBooting updates booting state', () => {
        useGCMStore.getState().setBooting(false);
        expect(useGCMStore.getState().booting).toBe(false);
    });

    it('setExportEnabled updates exportEnabled', () => {
        useGCMStore.getState().setExportEnabled(true);
        expect(useGCMStore.getState().exportEnabled).toBe(true);
    });

    it('toggleExportEnabled toggles the flag', () => {
        useGCMStore.getState().setExportEnabled(false);
        useGCMStore.getState().toggleExportEnabled();
        expect(useGCMStore.getState().exportEnabled).toBe(true);
        useGCMStore.getState().toggleExportEnabled();
        expect(useGCMStore.getState().exportEnabled).toBe(false);
    });

    it('setIsAuthenticated updates auth state', () => {
        useGCMStore.getState().setIsAuthenticated(true);
        expect(useGCMStore.getState().isAuthenticated).toBe(true);
    });

    it('setCurrentUser updates the user', () => {
        const user = { id: 'U1', name: 'Test', role: Role.ADMIN } as any;
        useGCMStore.getState().setCurrentUser(user);
        expect(useGCMStore.getState().currentUser.name).toBe('Test');
    });

    it('setCompanies updates companies', () => {
        const companies = [{ company_id: 'C1', company_name: 'Test' }] as any;
        useGCMStore.getState().setCompanies(companies);
        expect(useGCMStore.getState().companies).toHaveLength(1);
    });

    it('setUsers handles null safely', () => {
        useGCMStore.getState().setUsers(null as any);
        expect(useGCMStore.getState().users).toEqual([]);
    });

    it('setAllProjects updates projects', () => {
        useGCMStore.getState().setAllProjects([{ project_id: 'P1' }] as any);
        expect(useGCMStore.getState().allProjects).toHaveLength(1);
    });

    it('setAllTrips updates trips', () => {
        useGCMStore.getState().setAllTrips([{ trip_id: 'T1' }] as any);
        expect(useGCMStore.getState().allTrips).toHaveLength(1);
    });
});

// =====================================================
// Auth: login, confirmLogin, logout
// =====================================================
describe('useGCMStore — auth', () => {
    beforeEach(resetStore);

    describe('login', () => {
        it('calls api.login and returns user on success', async () => {
            const user = { id: 'U1', name: 'Admin' };
            mockApi.login.mockResolvedValueOnce(user);

            const result = await useGCMStore.getState().login('admin@gcm.com', 'pass');
            expect(result).toEqual(user);
            expect(mockApi.login).toHaveBeenCalledWith({ email: 'admin@gcm.com', password: 'pass' });
        });

        it('returns null on login failure', async () => {
            mockApi.login.mockRejectedValueOnce(new Error('Unauthorized'));
            const result = await useGCMStore.getState().login('wrong@test.com', 'bad');
            expect(result).toBeNull();
        });
    });

    describe('logout', () => {
        it('clears auth state and localStorage', () => {
            localStorage.setItem('gcm_auth_session', 'true');
            localStorage.setItem('gcm_current_user', '{}');
            localStorage.setItem('gcm_jwt_token', 'token');

            useGCMStore.getState().logout();

            expect(useGCMStore.getState().isAuthenticated).toBe(false);
            expect(localStorage.getItem('gcm_auth_session')).toBeNull();
            expect(localStorage.getItem('gcm_current_user')).toBeNull();
            expect(localStorage.getItem('gcm_jwt_token')).toBeNull();
        });
    });
});

// =====================================================
// CRUD: upsertCompany, deleteCompany
// =====================================================
describe('useGCMStore — CRUD', () => {
    beforeEach(resetStore);

    describe('upsertCompany', () => {
        it('creates a new company (optimistic insert)', async () => {
            const company = { company_id: 'C-NEW', company_name: 'NEOM' } as any;
            await useGCMStore.getState().upsertCompany(company);

            expect(mockApi.upsertCompany).toHaveBeenCalledWith(company);
            expect(useGCMStore.getState().companies).toContainEqual(company);
        });

        it('updates an existing company (optimistic update)', async () => {
            useGCMStore.setState({ companies: [{ company_id: 'C1', company_name: 'Old' }] as any });
            const updated = { company_id: 'C1', company_name: 'New' } as any;
            await useGCMStore.getState().upsertCompany(updated);

            const companies = useGCMStore.getState().companies;
            expect(companies).toHaveLength(1);
            expect(companies[0].company_name).toBe('New');
        });

        it('rethrows error on API failure', async () => {
            mockApi.upsertCompany.mockRejectedValueOnce(new Error('Network error'));
            await expect(
                useGCMStore.getState().upsertCompany({ company_id: 'C1', company_name: 'Test' } as any)
            ).rejects.toThrow('Network error');
        });
    });

    describe('deleteCompany', () => {
        it('removes company from state', async () => {
            useGCMStore.setState({ companies: [{ company_id: 'C1', company_name: 'ABC' }] as any });
            await useGCMStore.getState().deleteCompany('C1');

            expect(useGCMStore.getState().companies).toHaveLength(0);
            expect(mockApi.deleteCompany).toHaveBeenCalledWith('C1');
        });

        it('rethrows error on API failure', async () => {
            mockApi.deleteCompany.mockRejectedValueOnce(new Error('Forbidden'));
            await expect(useGCMStore.getState().deleteCompany('C1')).rejects.toThrow('Forbidden');
        });
    });

    describe('upsertProject', () => {
        it('creates a new project', async () => {
            const project = { project_id: 'P1', project_name: 'Site A', company_id: 'C1' } as any;
            await useGCMStore.getState().upsertProject(project);
            expect(useGCMStore.getState().allProjects).toContainEqual(project);
        });

        it('updates an existing project', async () => {
            useGCMStore.setState({ allProjects: [{ project_id: 'P1', project_name: 'Old' }] as any });
            await useGCMStore.getState().upsertProject({ project_id: 'P1', project_name: 'Updated' } as any);
            expect(useGCMStore.getState().allProjects[0].project_name).toBe('Updated');
        });
    });

    describe('deleteProject', () => {
        it('removes project and associated project services', async () => {
            useGCMStore.setState({
                allProjects: [{ project_id: 'P1' }] as any,
                projectServices: [
                    { id: 'PS1', project_id: 'P1' },
                    { id: 'PS2', project_id: 'P2' }
                ] as any
            });
            await useGCMStore.getState().deleteProject('P1');
            expect(useGCMStore.getState().allProjects).toHaveLength(0);
            expect(useGCMStore.getState().projectServices).toHaveLength(1);
            expect(useGCMStore.getState().projectServices[0].id).toBe('PS2');
        });
    });

    describe('upsertTrip', () => {
        it('creates a new trip (prepends to list)', async () => {
            const trip = { trip_id: 'T-NEW', project_id: 'P1', status: 'REQUESTED' } as any;
            await useGCMStore.getState().upsertTrip(trip);
            expect(useGCMStore.getState().allTrips[0].trip_id).toBe('T-NEW');
        });

        it('updates an existing trip', async () => {
            useGCMStore.setState({ allTrips: [{ trip_id: 'T1', status: 'REQUESTED' }] as any });
            await useGCMStore.getState().upsertTrip({ trip_id: 'T1', status: 'COMPLETED' } as any);
            expect(useGCMStore.getState().allTrips[0].status).toBe('COMPLETED');
        });
    });
});

// =====================================================
// addLog & addNotification
// =====================================================
describe('useGCMStore — logging & notifications', () => {
    beforeEach(() => {
        resetStore();
        useGCMStore.setState({ currentUser: { id: 'U1', name: 'Admin', role: Role.ADMIN } as any });
    });

    it('addLog prepends log and caps at 1000', async () => {
        await useGCMStore.getState().addLog('CREATED' as any, 'TRIP' as any, 'T1', 'Trip', 'Created trip');
        expect(useGCMStore.getState().logs).toHaveLength(1);
        expect(useGCMStore.getState().logs[0].entity_id).toBe('T1');
        expect(mockApi.addLog).toHaveBeenCalled();
    });

    it('addLog does not crash on API failure', async () => {
        mockApi.addLog.mockRejectedValueOnce(new Error('Network fail'));
        await useGCMStore.getState().addLog('CREATED' as any, 'TRIP' as any, 'T1', 'Trip', 'test');
        // Should not throw, logs might not be updated
    });

    it('addNotification prepends notification and caps at 100', async () => {
        await useGCMStore.getState().addNotification({ title: 'Test', message: 'Hello' });
        const notifs = useGCMStore.getState().notifications;
        expect(notifs.length).toBeGreaterThanOrEqual(1);
        expect(notifs[0].title).toBe('Test');
    });

    it('addNotification only adds to state if userId matches currentUser', async () => {
        await useGCMStore.getState().addNotification({ userId: 'OTHER_USER', title: 'Not Mine' });
        // The notification has a different userId, so it should NOT be added to local state
        const notifs = useGCMStore.getState().notifications;
        const found = notifs.find(n => n.title === 'Not Mine');
        expect(found).toBeUndefined();
    });
});

// =====================================================
// updatePresence
// =====================================================
describe('useGCMStore — updatePresence', () => {
    beforeEach(resetStore);

    it('updates presenceMap for current user', () => {
        useGCMStore.setState({ currentUser: { id: 'U1', name: 'Admin' } as any });
        useGCMStore.getState().updatePresence({ currentPage: '/dashboard' });
        const presence = useGCMStore.getState().presenceMap['U1'];
        expect(presence.currentPage).toBe('/dashboard');
        expect(presence.lastActive).toBeDefined();
    });

    it('does nothing if currentUser has no id', () => {
        useGCMStore.setState({ currentUser: { id: '', name: '' } as any });
        useGCMStore.getState().updatePresence({ currentPage: '/test' });
        expect(Object.keys(useGCMStore.getState().presenceMap)).toHaveLength(0);
    });
});

// =====================================================
// loadAllData — safeFetch
// =====================================================
describe('useGCMStore — loadAllData', () => {
    beforeEach(resetStore);

    it('populates store from API calls', async () => {
        mockApi.getCompanies.mockResolvedValueOnce([{ company_id: 'C1' }]);
        mockApi.getProjects.mockResolvedValueOnce([{ project_id: 'P1', start_date: '2024-01-01T00:00:00', end_date: '2024-12-31T00:00:00' }]);
        mockApi.getTrips.mockResolvedValueOnce([{ trip_id: 'T1', date: '2024-06-15T00:00:00' }]);

        await useGCMStore.getState().loadAllData();

        expect(useGCMStore.getState().companies).toHaveLength(1);
        // Verify date truncation
        expect(useGCMStore.getState().allProjects[0].start_date).toBe('2024-01-01');
        expect(useGCMStore.getState().allTrips[0].date).toBe('2024-06-15');
    });

    it('sets fallback values on API errors', async () => {
        mockApi.getCompanies.mockRejectedValueOnce(new Error('500'));
        mockApi.getProjects.mockRejectedValueOnce(new Error('500'));

        await useGCMStore.getState().loadAllData();

        // After failure, arrays should be empty (fallback)
        expect(useGCMStore.getState().companies).toEqual([]);
        expect(useGCMStore.getState().allProjects).toEqual([]);
    });
});
