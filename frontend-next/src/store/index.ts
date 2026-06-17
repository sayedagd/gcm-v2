import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { create } from 'zustand';
import {
  Company, Project, Trip, User, Role, SaaSConfig,
  ActivityLog, PermissionRequest, AppNotification, NotificationType, UserPresence,
  Service, Vehicle, Driver, Container, Tank, Scale, InventorySize, ActionType, EntityType, RequestStatus, Supplier, ProjectService, TripStatus, Facility, AssetRequest, AssetServiceLink
} from '@/types';
import {
  INITIAL_USER
} from '@/constants';
import { createApiClient } from '@/api/client';
import { buildEntityLink, getBilingualError } from '@/store/helpers';
import { AUTH_COOKIE, LEGACY_BOOTSTRAP_COOKIE, ROLE_COOKIE, SESSION_EXP_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/features/auth/model/sessionCookies';
import { toast } from '@/utils/toast';
import {
  validateCompany, validateProject, validateTrip, validateVehicle,
  validateDriver, validateSupplier, validateFacility, validateService, validateInventory,
  validateDriverForTrip, validateVehicleForTrip,
  validateProjectHasCompany, validateFacilityAcceptsService
} from '@/utils/validationSchemas';
import { createEmptySaaSConfig, mapSystemConfigToSaaSConfig } from '@/store/saasConfig';

const writeBrowserCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (typeof document === 'undefined') {
    return;
  }

  const isSecure = window.location.protocol === 'https:';
  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expires}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
};

const clearBrowserCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

const getApiBaseUrl = () => {
  const runtimeUrl = typeof window !== 'undefined' ? (window as any).GCM_CONFIG?.API_BASE_URL : undefined;
  if (runtimeUrl) return runtimeUrl;
  const nextEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (nextEnvUrl && nextEnvUrl !== 'undefined') return nextEnvUrl;
  return '';
};

const getStoredDarkMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem('gcm_dark_mode') === 'true';
};

/**
 * [AR] واجهة المخزن العالمي
 */
interface GCMStoreState {
  darkMode: boolean;
  booting: boolean;
  currentUser: User;
  isAuthenticated: boolean;
  saasConfig: SaaSConfig;
  exportEnabled: boolean;
  resourceErrors: Record<string, string | null>;

  companies: Company[];
  allProjects: Project[];
  allTrips: Trip[];
  users: User[];
  notifications: AppNotification[];
  presenceMap: Record<string, UserPresence>;
  services: Service[];
  vehicles: Vehicle[];
  drivers: Driver[];
  containers: Container[];
  tanks: Tank[];
  inventorySizes: InventorySize[];
  scales: Scale[];
  permissionRequests: PermissionRequest[];
  contactSubmissions: any[];
  projectServices: ProjectService[];
  suppliers: Supplier[];
  facilities: Facility[];
  logs: ActivityLog[];
  environmentalEquipments: any[];
  equipmentInquiries: any[];
  assetRequests: AssetRequest[];
  assetServiceLinks: AssetServiceLink[];
}

interface GCMStoreActions {
  api: ReturnType<typeof createApiClient>;
  setDarkMode: (val: boolean) => void;
  setBooting: (val: boolean) => void;
  setExportEnabled: (val: boolean) => void;
  setIsAuthenticated: (val: boolean) => void;
  setCurrentUser: (u: User) => void;
  setSaasConfig: (c: SaaSConfig) => void;

  setCompanies: (d: Company[]) => void;
  setAllProjects: (d: Project[]) => void;
  setAllTrips: (d: Trip[]) => void;
  setUsers: (d: User[]) => void;
  setNotifications: (d: AppNotification[]) => void;
  setPresenceMap: (d: Record<string, UserPresence>) => void;
  setServices: (d: Service[]) => void;
  setVehicles: (d: Vehicle[]) => void;
  setDrivers: (d: Driver[]) => void;
  setContainers: (d: Container[]) => void;
  setTanks: (d: Tank[]) => void;
  setScales: (d: Scale[]) => void;
  setInventorySizes: (d: InventorySize[]) => void;
  setPermissionRequests: (d: PermissionRequest[]) => void;
  setContactSubmissions: (d: any[]) => void;
  setProjectServices: (d: ProjectService[]) => void;
  setSuppliers: (d: Supplier[]) => void;
  setFacilities: (d: Facility[]) => void;
  setLogs: (d: ActivityLog[]) => void;
  setEnvironmentalEquipments: (d: any[]) => void;
  setEquipmentInquiries: (d: any[]) => void;
  setAssetRequests: (d: AssetRequest[]) => void;
  setAssetServiceLinks: (d: AssetServiceLink[]) => void;
  syncAssetServiceLinks: (assetType: string, assetId: string, serviceIds: string[]) => Promise<void>;

  login: (email: string, password?: string) => Promise<User | null>;
  confirmLogin: (user: User, remember?: boolean) => Promise<void>;
  logout: () => void;
  loadAllData: () => Promise<void>;
  dispatchSystemEvent: (action: ActionType, entityType: EntityType, entityId: string, entityName: string, details: string, severity?: NotificationType) => Promise<void>;
  addLog: (action: ActionType, entity_type: EntityType, entity_id: string, entity_name: string, details: string) => Promise<void>;
  addNotification: (notif: Partial<AppNotification>) => Promise<void>;
  syncSaasConfig: (next: SaaSConfig) => Promise<void>;
  toggleExportEnabled: () => void;
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => Promise<void>;
  addContactSubmission: (data: any) => Promise<void>;
  deleteContactSubmission: (id: string) => Promise<void>;

  addPermissionRequest: (data: any) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  deletePermissionRequest: (id: string) => Promise<void>;

  // --- CRUD Actions ---
  upsertCompany: (c: Company, skipValidation?: boolean) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  upsertProject: (p: Project, skipValidation?: boolean) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  upsertProjectService: (ps: ProjectService) => Promise<void>;
  deleteProjectService: (id: string) => Promise<void>;
  upsertTrip: (t: Trip, skipValidation?: boolean) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  resolveDuplicateTrip: (keepTripId: string, cancelTripIds: string[]) => Promise<void>;
  upsertUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  upsertService: (s: Service, skipValidation?: boolean) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  upsertVehicle: (v: Vehicle, skipValidation?: boolean) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  upsertDriver: (d: Driver, skipValidation?: boolean) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  upsertContainer: (c: Container) => Promise<void>;
  deleteContainer: (id: string) => Promise<void>;
  upsertTank: (t: Tank) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  upsertInventorySize: (s: InventorySize) => Promise<void>;
  deleteInventorySize: (id: string) => Promise<void>;
  upsertScale: (s: Scale) => Promise<void>;
  deleteScale: (id: string) => Promise<void>;
  upsertSupplier: (s: Supplier, skipValidation?: boolean) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  upsertFacility: (f: Facility, skipValidation?: boolean) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  updatePresence: (data: Partial<UserPresence>) => void;

  requestAddition: (type: 'VEHICLE' | 'DRIVER' | 'CONTAINER' | 'TANK', data: any) => Promise<void>;
  processAssetRequest: (id: string | number, status: RequestStatus, notes?: string) => Promise<void>;
  updateSaaS: (c: Partial<SaaSConfig>) => Promise<void>;
  updateLandingPage: (lp: any) => Promise<void>;
  updateStorePage: (sp: any) => Promise<void>;

  // Equipment Actions
  upsertEquipment: (eq: any) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateEquipmentInquiry: (id: number | string, data: any) => Promise<void>;
  deleteEquipmentInquiry: (id: number | string) => Promise<void>;
  submitEquipmentInquiry: (data: any) => Promise<void>;
  shareEquipment: (id: string) => Promise<void>;

  resetData: () => void;
}

export type GCMStore = GCMStoreState & GCMStoreActions;

export const useGCMStore = create<GCMStore>((set, get) => ({
  darkMode: getStoredDarkMode(),
  booting: true,
  currentUser: INITIAL_USER,
  isAuthenticated: false,
  saasConfig: createEmptySaaSConfig(),
  exportEnabled: false,
  resourceErrors: {},

  companies: [],
  allProjects: [],
  allTrips: [],
  users: [],
  notifications: [],
  presenceMap: {},
  services: [],
  vehicles: [],
  drivers: [],
  containers: [],
  tanks: [],
  inventorySizes: [],
  scales: [],
  permissionRequests: [],
  contactSubmissions: [],
  projectServices: [],
  suppliers: [],
  facilities: [],
  logs: [],
  environmentalEquipments: [],
  equipmentInquiries: [],
  assetRequests: [],
  assetServiceLinks: [],

  resetData: () => set({
    companies: [],
    allProjects: [],
    allTrips: [],
    users: [],
    notifications: [],
    presenceMap: {},
    services: [],
    vehicles: [],
    drivers: [],
    containers: [],
    tanks: [],
    scales: [],
    inventorySizes: [],
    permissionRequests: [],
    contactSubmissions: [],
    projectServices: [],
    suppliers: [],
    facilities: [],
    logs: [],
    environmentalEquipments: [],
    equipmentInquiries: [],
    assetRequests: [],
    assetServiceLinks: [],
    resourceErrors: {},
  }),

  api: createApiClient(getApiBaseUrl),

  setDarkMode: (darkMode) => {
    localStorage.setItem('gcm_dark_mode', darkMode.toString());
    set({ darkMode });
  },
  setBooting: (booting) => set({ booting }),
  setExportEnabled: (exportEnabled) => set({ exportEnabled }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSaasConfig: (saasConfig) => set({ saasConfig }),

  setCompanies: (companies) => set({ companies }),
  setAllProjects: (allProjects) => set({ allProjects }),
  setAllTrips: (allTrips) => set({ allTrips }),
  setUsers: (users) => set({ users: users ?? [] }),
  setNotifications: (notifications) => set({ notifications }),
  setPresenceMap: (presenceMap) => set({ presenceMap }),
  setServices: (services) => set({ services }),
  setVehicles: (vehicles) => set({ vehicles }),
  setDrivers: (drivers) => set({ drivers }),
  setContainers: (containers) => set({ containers }),
  setTanks: (tanks) => set({ tanks }),
  setScales: (scales) => set({ scales }),
  setInventorySizes: (inventorySizes) => set({ inventorySizes }),
  setPermissionRequests: (permissionRequests) => set({ permissionRequests }),
  setContactSubmissions: (contactSubmissions) => set({ contactSubmissions }),
  setProjectServices: (projectServices) => set({ projectServices }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setFacilities: (facilities) => set({ facilities }),
  setLogs: (logs) => set({ logs }),
  setEnvironmentalEquipments: (environmentalEquipments) => set({ environmentalEquipments }),
  setEquipmentInquiries: (equipmentInquiries) => set({ equipmentInquiries }),
  setAssetRequests: (assetRequests) => set({ assetRequests }),
  setAssetServiceLinks: (assetServiceLinks) => set({ assetServiceLinks }),

  syncAssetServiceLinks: async (assetType, assetId, serviceIds) => {
    const { api } = get();
    try {
      const result = await api.syncAssetServiceLinks(assetType, assetId, serviceIds);
      // Update local state: remove old links for this asset, add new ones
      set(state => ({
        assetServiceLinks: [
          ...state.assetServiceLinks.filter(l => !(l.asset_type === assetType && l.asset_id === assetId)),
          ...(result.links || [])
        ]
      }));
    } catch (err) {
      console.error('[AssetServiceLinks] Sync failed:', err);
      throw err;
    }
  },

  updatePresence: (data) => {
    const { currentUser, presenceMap } = get();
    if (!currentUser || !currentUser.id) return;
    set({
      presenceMap: {
        ...presenceMap,
        [currentUser.id]: {
          ...(presenceMap[currentUser.id] || { userId: currentUser.id, lastActive: new Date().toISOString(), currentPage: window.location.pathname }),
          ...data,
          lastActive: new Date().toISOString()
        }
      }
    });
  },

  login: async (email, password) => {
    const { api } = get();
    try {
      return await api.login({ email, password });
    } catch (err) {
      console.error("Login verification failed:", err);
      return null;
    }
  },

  confirmLogin: async (user, remember) => {
    const { loadAllData, dispatchSystemEvent } = get();
    set({ currentUser: user, isAuthenticated: true });

    const expiresInSeconds = SESSION_MAX_AGE_SECONDS;
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;
    writeBrowserCookie(AUTH_COOKIE, 'true', expiresInSeconds);
    writeBrowserCookie(ROLE_COOKIE, user.role, expiresInSeconds);
    writeBrowserCookie(SESSION_EXP_COOKIE, String(expiresAtMs), expiresInSeconds);
    writeBrowserCookie(LEGACY_BOOTSTRAP_COOKIE, JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id || null,
      project_id: user.project_id || null,
      supplier_id: user.supplier_id || null,
      expiresAtMs,
    }), expiresInSeconds);

    if (remember) {
      localStorage.setItem('gcm_auth_session', 'true');
      localStorage.setItem('gcm_current_user', JSON.stringify(user));
      localStorage.setItem('gcm_last_active', Date.now().toString());
    }

    await loadAllData();
    await dispatchSystemEvent(ActionType.LOGIN, EntityType.USER, user.id, user.name, `User session started`, NotificationType.SUCCESS);
  },

  logout: () => {
    // We intentionally don't dispatch an event here as the user's token is usually already invalidated
    // or the backend throws 400 Bad Request due to missing/invalidated token.
    localStorage.removeItem('gcm_auth_session');
    localStorage.removeItem('gcm_current_user');
    clearBrowserCookie(AUTH_COOKIE);
    clearBrowserCookie(ROLE_COOKIE);
    clearBrowserCookie(SESSION_EXP_COOKIE);
    clearBrowserCookie(LEGACY_BOOTSTRAP_COOKIE);
    get().resetData();
    set({ isAuthenticated: false, currentUser: INITIAL_USER });
  },

  loadAllData: async () => {
    const { api } = get();
    const safeFetch = async (
      key: string,
      fetcher: () => Promise<any>,
      setter: (d: any) => void,
      fallback: any = []
    ) => {
      try {
        const data = await fetcher();
        setter((Array.isArray(fallback) && !Array.isArray(data)) ? fallback : (data || fallback));
        set((state) => ({ resourceErrors: { ...state.resourceErrors, [key]: null } }));
      } catch (err: any) {
        set((state) => ({
          resourceErrors: {
            ...state.resourceErrors,
            [key]: err?.message || 'Request failed',
          }
        }));
      }
    };

    try {
      await Promise.allSettled([
        safeFetch('companies', api.getCompanies, (d) => set({ companies: d })),
        safeFetch('projects', api.getProjects, (d) => set({
          allProjects: (d || []).map((p: any) => ({
            ...p,
            service_ids: p.service_ids || [],
            start_date: p.start_date?.split('T')[0] || '',
            end_date: p.end_date?.split('T')[0] || ''
          }))
        })),
        safeFetch('trips', api.getTrips, (d) => set({ allTrips: (d || []).map((t: any) => ({ ...t, date: t.date?.split('T')[0] || t.date || '' })) })),
        safeFetch('users', api.getUsers, (d) => set({ users: d })),
        safeFetch('services', api.getServices, (d) => set({ services: d })),
        safeFetch('vehicles', api.getVehicles, (d) => set({
          vehicles: (d || []).map((v: any) => {
            let docs = [];
            try { docs = typeof v.documents === 'string' ? JSON.parse(v.documents) : (v.documents || []); } catch (e) { docs = []; }
            let permits = [];
            try { permits = typeof v.permit_zones === 'string' ? JSON.parse(v.permit_zones) : (v.permit_zones || []); } catch (e) { permits = []; }
            return { ...v, documents: Array.isArray(docs) ? docs : [], permit_zones: Array.isArray(permits) ? permits : [] };
          })
        })),
        safeFetch('drivers', api.getDrivers, (d) => set({
          drivers: (d || []).map((dr: any) => {
            let permits = [];
            try { permits = typeof dr.permit_zones === 'string' ? JSON.parse(dr.permit_zones) : (dr.permit_zones || []); } catch (e) { permits = []; }
            return { ...dr, permit_zones: Array.isArray(permits) ? permits : [] };
          })
        })),
        safeFetch('containers', api.getContainers, (d) => set({ containers: d })),
        safeFetch('tanks', api.getTanks, (d) => set({ tanks: d })),
        safeFetch('scales', api.getScales, (d) => set({ scales: d })),
        safeFetch('inventorySizes', api.getInventorySizes, (d) => set({ inventorySizes: d })),
        safeFetch('logs', api.getLogs, (d) => set({ logs: d })),
        safeFetch('notifications', api.getNotifications, (d) => set({ notifications: (d || []).map((n: any) => ({ ...n, isRead: n.read })) })),
        safeFetch('permissionRequests', api.getPermissionRequests, (d) => set({ permissionRequests: (d || []).map((r: any) => ({ ...r, fromLocation: r.from_location })) })),
        safeFetch('contactSubmissions', api.getContactSubmissions, (d) => set({ contactSubmissions: d })),
        safeFetch('projectServices', api.getProjectServices, (d) => set({ projectServices: d })),
        safeFetch('suppliers', api.getSuppliers, (d) => set({ suppliers: d })),
        safeFetch('environmentalEquipments', api.getEquipments, (d) => set({ environmentalEquipments: d })),
        safeFetch('equipmentInquiries', api.getEquipmentInquiries, (d) => set({ equipmentInquiries: d })),
        safeFetch('facilities', api.getFacilities, (d) => set({
          facilities: (d || []).map((f: any) => ({
            ...f,
            accepted_services: typeof f.accepted_services === 'string' ? JSON.parse(f.accepted_services) : (Array.isArray(f.accepted_services) ? f.accepted_services : [])
          }))
        })),
        safeFetch('assetRequests', api.getAssetRequests, (d) => set({ assetRequests: d })),
        safeFetch('assetServiceLinks', api.getAssetServiceLinks, (d) => set({ assetServiceLinks: d }))
      ]);
    } catch (e) {
      console.warn("Massive data fetch failure.");
    }
  },

  addLog: async (action, entity_type, entity_id, entity_name, details) => {
    const { api, currentUser } = get();
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      entity_type,
      entity_id,
      entity_name,
      details,
      timestamp: new Date().toISOString(),
      user_id: currentUser.id
    };
    try {
      await api.addLog(newLog);
      set(state => ({ logs: [newLog, ...state.logs].slice(0, 1000) }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('API endpoint not found') && !message.includes('Invalid CSRF token')) {
        console.error("Failed to add log:", err);
      }
    }
  },

  addNotification: async (notif) => {
    const { api, currentUser } = get();
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      userId: currentUser.id,
      title: notif.title || 'System Alert',
      message: notif.message || '',
      type: notif.type || NotificationType.SYSTEM,
      ...notif
    };
    try {
      if (api.addNotification) {
        await api.addNotification({ ...newNotif, read: newNotif.isRead, user_id: newNotif.userId });
      }
      if (newNotif.userId === currentUser.id) {
        set(state => ({ notifications: [newNotif, ...state.notifications].slice(0, 100) }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('API endpoint not found') && !message.includes('Invalid CSRF token')) {
        console.error("Failed to add notification:", err);
      }
    }
  },

  toggleNotificationRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: !n.isRead } : n
      )
    }));
  },

  deleteNotification: async (id) => {
    const { api } = get();
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
    try {
      if (api.deleteNotification) await api.deleteNotification(id);
    } catch (e) { console.error('[Notification] Delete failed:', e); }
  },

  dispatchSystemEvent: async (action, entityType, entityId, entityName, details, severity = NotificationType.SYSTEM) => {
    const { addLog, addNotification, currentUser } = get();
    try {
      await addLog(action, entityType, entityId, entityName, details);
    } catch (e) {
      console.warn('[System Event] Failed to dispatch activity log:', e);
    }
    try {
      const link = buildEntityLink(entityType, entityId);
      await addNotification({
        title: `${action}: ${entityName}`,
        message: details,
        type: severity,
        ...(currentUser.company_id ? { companyId: currentUser.company_id } : {}),
        ...(currentUser.project_id ? { projectId: currentUser.project_id } : {}),
        ...(link ? { link } : {})
      });
    } catch (e) {
      console.warn('[System Event] Failed to dispatch notification:', e);
    }
  },

  syncSaasConfig: (next) => {
    const { api } = get();
    return api.upsertConfig({
      app_name_ar: next.appNameAr, app_name_en: next.appNameEn,
      app_slogan_ar: next.appSloganAr, app_slogan_en: next.appSloganEn,
      primary_color: next.primaryColor, logo_url: next.logoUrl,
      logo_dark_url: next.logoDarkUrl, language: next.language,
      landing_page: next.landingPage,
      store_page: next.storePage,
      boot_config: next.bootConfig,
      template_config: next.templateConfig,
      ai_assistant: next.aiAssistant,
      management_controls_enabled: next.managementControlsEnabled,
      support_phone: next.support_phone,
      support_whatsapp: next.support_whatsapp
    });
  },

  addContactSubmission: async (data) => {
    const { api } = get();
    try {
      await api.addContactSubmission(data);
    } catch (err) {
      console.error("Failed to add contact submission:", err);
      throw err;
    }
  },

  deleteContactSubmission: async (id) => {
    const { api } = get();
    try {
      await api.deleteContactSubmission(id);
      set(state => ({
        contactSubmissions: state.contactSubmissions.filter((submission: any) => submission.id !== id)
      }));
    } catch (err) {
      console.error("Failed to delete contact submission:", err);
      throw err;
    }
  },

  addPermissionRequest: async (data) => {
    const { api } = get();
    try {
      await api.upsertPermissionRequest(data);
      await get().loadAllData();
    } catch (err) {
      console.error("Failed to add permission request:", err);
      throw err;
    }
  },

  updateRequestStatus: async (id, status) => {
    const { api, permissionRequests } = get();
    try {
      const existing = permissionRequests.find(r => r.id === id);
      if (!existing) {
        throw new Error('Permission request not found');
      }

      await api.upsertPermissionRequest({
        ...existing,
        from_location: (existing as any).from_location || (existing as any).fromLocation,
        status,
      });

      set(state => ({
        permissionRequests: state.permissionRequests.map(r => r.id === id ? { ...r, status } : r)
      }));
    } catch (err) {
      console.error("Failed to update permission request:", err);
      throw err;
    }
  },

  deletePermissionRequest: async (id) => {
    const { api } = get();
    try {
      await api.deletePermissionRequest(id);
      set(state => ({
        permissionRequests: state.permissionRequests.filter(r => r.id !== id)
      }));
    } catch (err) {
      console.error("Failed to delete permission request:", err);
      throw err;
    }
  },

  toggleExportEnabled: () => set(state => ({ exportEnabled: !state.exportEnabled })),

  // --- CRUD Implementation ---
  upsertCompany: async (c, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateCompany(c as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertCompany(c, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.companies.some(x => x.company_id === c.company_id);
        return { companies: isUpdate ? state.companies.map(x => x.company_id === c.company_id ? c : x) : [...state.companies, c] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.COMPANY, c.company_id, c.company_name, `${isUpdate ? 'Revised' : 'Established'} company profile: ${c.company_name}`, NotificationType.SUCCESS);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ بيانات العميل', 'Failed to save company');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.COMPANY, c.company_id, c.company_name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteCompany: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, companies, allProjects, allTrips } = get();
    const isAr = saasConfig.language === 'ar';
    const hasProjects = allProjects.some(p => p.company_id === id);
    if (hasProjects) {
        const msg = isAr ? 'لا يمكن حذف عميل لديه مشاريع مسجلة' : 'Cannot delete a client with associated projects';
        toast.error(msg);
        throw new Error(msg);
    }
    const hasActiveTrips = allTrips.some(t => t.company_id === id && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED);
    if (hasActiveTrips) {
        const msg = isAr ? 'لا يمكن حذف عميل لديه رحلات نشطة' : 'Cannot delete a client with active trips';
        toast.error(msg);
        throw new Error(msg);
    }
    const target = companies.find(c => c.company_id === id);
    try {
      await api.deleteCompany(id);
      set(state => ({ companies: state.companies.filter(x => x.company_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.COMPANY, id, target?.company_name || 'Company', `Removed company profile: ${target?.company_name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف العميل', 'Failed to delete company');
      dispatchSystemEvent(ActionType.DELETED, EntityType.COMPANY, id, 'Company', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertProject: async (pr, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, allProjects, companies } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateProject(pr as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
      const companyValidation = validateProjectHasCompany(pr.company_id, companies);
      if (!companyValidation.valid) {
        const msg = isAr ? companyValidation.errorAr! : companyValidation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertProject(pr, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.allProjects.some(x => x.project_id === pr.project_id);
        return { allProjects: isUpdate ? state.allProjects.map(x => x.project_id === pr.project_id ? pr : x) : [...state.allProjects, pr] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.PROJECT, pr.project_id, pr.project_name, `${isUpdate ? 'Updated' : 'Initialized'} project site: ${pr.project_name}`, NotificationType.SUCCESS);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ المشروع', 'Failed to save project');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.PROJECT, pr.project_id, pr.project_name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteProject: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, allProjects, allTrips } = get();
    const isAr = saasConfig.language === 'ar';
    const hasActiveTrips = allTrips.some(t => t.project_id === id && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED);
    if (hasActiveTrips) {
        const msg = isAr ? 'لا يمكن حذف مشروع لديه رحلات نشطة' : 'Cannot delete a project with active trips';
        toast.error(msg);
        throw new Error(msg);
    }
    const target = allProjects.find(p => p.project_id === id);
    try {
      await api.deleteProject(id);
      set(state => ({
        allProjects: state.allProjects.filter(x => x.project_id !== id),
        projectServices: state.projectServices.filter(x => x.project_id !== id)
      }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.PROJECT, id, target?.project_name || 'Project', `Archived project site: ${target?.project_name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف المشروع', 'Failed to delete project');
      dispatchSystemEvent(ActionType.DELETED, EntityType.PROJECT, id, 'Project', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertProjectService: async (ps) => {
    const { api, saasConfig, dispatchSystemEvent, services, projectServices } = get();
    try {
      await api.upsertProjectService(ps);
      let isUpdate = false;
      const sName = services.find(sx => sx.service_id === ps.service_id)?.service_name || 'Service';
      set(state => {
        isUpdate = state.projectServices.some(x => x.id === ps.id);
        return { projectServices: isUpdate ? state.projectServices.map(x => x.id === ps.id ? ps : x) : [...state.projectServices, ps] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.SERVICE, ps.id, sName, `${isUpdate ? 'Modified' : 'Assigned'} service agreement for project: ${sName}`, NotificationType.SYSTEM);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ خدمة المشروع', 'Failed to save project service');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.SERVICE, ps.id, 'Project Service', msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteProjectService: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, projectServices, services } = get();
    const target = projectServices.find(ps => ps.id === id);
    const sName = services.find(sx => sx.service_id === target?.service_id)?.service_name || 'Service';
    try {
      await api.deleteProjectService(id);
      set(state => ({ projectServices: state.projectServices.filter(x => x.id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.SERVICE, id, sName, `Rescinded service agreement: ${sName}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف خدمة المشروع', 'Failed to delete project service');
      dispatchSystemEvent(ActionType.DELETED, EntityType.SERVICE, id, 'Project Service', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertTrip: async (t, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, allTrips, allProjects, users, currentUser, drivers, vehicles, facilities, addNotification } = get();
    const isAr = saasConfig.language === 'ar';

    if (!skipValidation) {
      // --- Phase 1: Schema Validation ---
      const tripValidation = validateTrip(t as any);
      if (!tripValidation.valid) {
        const msg = isAr ? tripValidation.errorAr! : tripValidation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }

      // --- Phase 1: Business Logic Guards ---
      if (t.facility_id && t.service_id) {
        const facility = facilities.find(f => f.facility_id === t.facility_id);
        if (facility) {
          const facilityCheck = validateFacilityAcceptsService(facility, t.service_id);
          if (!facilityCheck.valid) {
            const msg = isAr ? facilityCheck.errorAr! : facilityCheck.errorEn!;
            toast.error(msg);
            throw new Error(msg);
          }
        }
      }
    }
    
    // [POLICY] Driver/Vehicle warnings are non-blocking for admin trip registration.
    // Show a warning toast but allow the trip to be saved.
    if (t.driver_id) {
      const driver = drivers.find(d => d.driver_id === t.driver_id);
      if (driver) {
        const driverCheck = validateDriverForTrip(driver);
        if (!driverCheck.valid) {
          toast.warning(isAr ? driverCheck.errorAr! : driverCheck.errorEn!);
        }
      }
    }
    if (t.vehicle_id) {
      const vehicle = vehicles.find(v => v.vehicle_id === t.vehicle_id);
      if (vehicle) {
        const vehicleCheck = validateVehicleForTrip(vehicle);
        if (!vehicleCheck.valid) {
          toast.warning(isAr ? vehicleCheck.errorAr! : vehicleCheck.errorEn!);
        }
      }
    }

    const oldTrip = allTrips.find(x => x.trip_id === t.trip_id);
    let isUpdate = !!oldTrip;

    try {
      const hasManifest = t.waste_manifest_no && t.manifest_file;
      const hasDN = t.delivery_note_no && t.delivery_note_file;
      if (hasManifest && hasDN && t.status !== TripStatus.CANCELLED && t.status !== TripStatus.COMPLETED) {
        t.status = TripStatus.COMPLETED;
      }

      // Optimistic update: add to store BEFORE server call to prevent Socket duplicate
      set(state => {
        isUpdate = state.allTrips.some(x => x.trip_id === t.trip_id);
        return { allTrips: isUpdate ? state.allTrips.map(x => x.trip_id === t.trip_id ? t : x) : [t, ...state.allTrips] };
      });

      await api.upsertTrip(t, skipValidation);
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.TRIP, t.trip_id, t.trip_id, `${isUpdate ? 'Revised' : 'Manifested'} logistics trip: ${t.trip_id}`, NotificationType.SUCCESS);

      // [PERF] Fire-and-forget: Notifications are non-critical, don't block the save response
      (async () => {
        try {
          const isAr = saasConfig.language === 'ar';
          const project = allProjects.find(p => p.project_id === t.project_id);
          const projectName = project?.project_name || t.project_id;
          const statusChanged = !oldTrip || oldTrip.status !== t.status;

          const tripHighlight = `?highlight=${encodeURIComponent(t.trip_id)}`;
          if (t.status === TripStatus.REQUESTED && statusChanged) {
            users.filter(u => u.role === Role.LOGISTICS && u.id !== currentUser.id).forEach(u => {
              addNotification({ userId: u.id, title: isAr ? 'طلب رحلة جديد' : 'New Trip Request', message: `${projectName}`, type: NotificationType.OPERATIONAL, link: `/logistics/queue${tripHighlight}` });
            });
          }
          if (t.status === TripStatus.ASSIGNED && statusChanged && t.driver_id) {
            const driver = drivers.find(d => d.driver_id === t.driver_id);
            if (driver) {
              const dUser = users.find(u => u.name === driver.name && u.id !== currentUser.id);
              if (dUser) addNotification({ userId: dUser.id, title: isAr ? 'تم تعيينك لرحلة' : 'Trip Assigned', message: projectName, type: NotificationType.OPERATIONAL, link: `/driver${tripHighlight}` });
            }
          }
          if (t.status === TripStatus.PENDING_APPROVAL && statusChanged) {
            users.filter(u => (
              (u.role === Role.COMPANY_USER && u.company_id === t.company_id) ||
              (u.role === Role.PROJECT_USER && u.project_id === t.project_id) ||
              (u.role === Role.CLIENT && u.company_id === t.company_id)
            ) && u.id !== currentUser.id).forEach(u => {
              addNotification({ userId: u.id, title: isAr ? 'رحلة جاهزة للموافقة' : 'Trip Ready for Approval', message: t.trip_id, type: NotificationType.OPERATIONAL, link: `/client/dashboard${tripHighlight}` });
            });
          }

          const manifestJustGenerated = (!oldTrip?.is_manifest_generated && t.is_manifest_generated) || (!oldTrip?.manifest_file && !!t.manifest_file && !!t.waste_manifest_no);
          if (manifestJustGenerated) {
            users.filter(u => (
              (u.role === Role.COMPANY_USER && u.company_id === t.company_id) ||
              (u.role === Role.PROJECT_USER && u.project_id === t.project_id) ||
              (u.role === Role.CLIENT && u.company_id === t.company_id)
            ) && u.id !== currentUser.id).forEach(u => {
              addNotification({ userId: u.id, title: isAr ? 'إصدار المانفيست' : 'Manifest Issued', message: isAr ? `تم إصدار المانفيست للرحلة ${t.trip_id}` : `Manifest issued for trip ${t.trip_id}`, type: NotificationType.SUCCESS, link: `/client/reports${tripHighlight}` });
            });
          }
        } catch (notifErr) {
          console.error('[Notification Error — non-blocking]', notifErr);
        }
      })();

    } catch (err) {
      // Rollback optimistic update
      if (!isUpdate) {
        set(state => ({ allTrips: state.allTrips.filter(x => x.trip_id !== t.trip_id) }));
      } else if (oldTrip) {
        set(state => ({ allTrips: state.allTrips.map(x => x.trip_id === t.trip_id ? oldTrip : x) }));
      }

      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ الرحلة', 'Failed to save trip');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.TRIP, t.trip_id, t.trip_id, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteTrip: async (id) => {
    const { api, saasConfig, dispatchSystemEvent } = get();
    try {
      await api.deleteTrip(id);
      set(state => ({ allTrips: state.allTrips.filter(x => x.trip_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.TRIP, id, id, `Voided logistics manifest: ${id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف الرحلة', 'Failed to delete trip');
      toast.error(msg);
      dispatchSystemEvent(ActionType.DELETED, EntityType.TRIP, id, id, msg, NotificationType.ERROR);
    }
  },
  resolveDuplicateTrip: async (keepTripId, cancelTripIds) => {
    const { api, allTrips, dispatchSystemEvent } = get();
    try {
      for (const id of cancelTripIds) {
        const trip = allTrips.find(t => t.trip_id === id);
        if (trip && trip.status !== TripStatus.CANCELLED) {
          const updatedTrip = { ...trip, status: TripStatus.CANCELLED, notes: (trip.notes ? trip.notes + '\n' : '') + '[System] Cancelled as Duplicate' };
          await api.upsertTrip(updatedTrip);
          set(state => ({ allTrips: state.allTrips.map(x => x.trip_id === id ? updatedTrip : x) }));
          dispatchSystemEvent(ActionType.UPDATED, EntityType.TRIP, id, id, `Cancelled duplicate trip: ${id}`, NotificationType.SYSTEM);
        }
      }
      toast.success('تم معالجة التكرار بنجاح / Duplicates resolved successfully');
    } catch (err) {
      toast.error('حدث خطأ أثناء معالجة التكرار / Error resolving duplicates');
      console.error(err);
      throw err;
    }
  },
  upsertUser: async (u) => {
    const { api, saasConfig, dispatchSystemEvent, users, currentUser } = get();
    try {
      await api.upsertUser(u);
      const isUpdate = users.some(x => x.id === u.id);

      set(state => ({
        users: [...state.users.filter(x => x.id !== u.id), u],
        ...(state.currentUser?.id === u.id ? { currentUser: u } : {})
      }));

      if (currentUser?.id === u.id) {
        localStorage.setItem('gcm_current_user', JSON.stringify(u));
      }

      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.USER, u.id, u.name, `${isUpdate ? 'Modified' : 'Provisioned'} user account: ${u.name}`, NotificationType.SECURITY);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ المستخدم', 'Failed to save user');
      toast.error(msg);
      dispatchSystemEvent(ActionType.UPDATED, EntityType.USER, u.id, u.name, msg, NotificationType.ERROR);
    }
  },
  deleteUser: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, users } = get();
    const target = users.find(u => u.id === id);
    try {
      await api.deleteUser(id);
      set(state => ({ users: state.users.filter(x => x.id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.USER, id, target?.name || 'User', `Deprovisioned user account: ${target?.name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف المستخدم', 'Failed to delete user');
      toast.error(msg);
      dispatchSystemEvent(ActionType.DELETED, EntityType.USER, id, 'User', msg, NotificationType.ERROR);
    }
  },
  upsertService: async (s, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, services } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateService(s as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertService(s);
      let isUpdate = false;
      set(state => {
        isUpdate = state.services.some(x => x.service_id === s.service_id);
        return { services: isUpdate ? state.services.map(x => x.service_id === s.service_id ? s : x) : [...state.services, s] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.SERVICE, s.service_id, s.service_name, `${isUpdate ? 'Updated' : 'Added'} global service type: ${s.service_name}`, NotificationType.SYSTEM);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ الخدمة', 'Failed to save service');
      toast.error(msg);
      dispatchSystemEvent(ActionType.UPDATED, EntityType.SERVICE, s.service_id, s.service_name, msg, NotificationType.ERROR);
    }
  },
  deleteService: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, services } = get();
    const target = services.find(s => s.service_id === id);
    try {
      await api.deleteService(id);
      set(state => ({ services: state.services.filter(x => x.service_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.SERVICE, id, target?.service_name || 'Service', `Removed global service: ${target?.service_name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف الخدمة', 'Failed to delete service');
      toast.error(msg);
      dispatchSystemEvent(ActionType.DELETED, EntityType.SERVICE, id, 'Service', msg, NotificationType.ERROR);
    }
  },
  upsertVehicle: async (v, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, vehicles } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateVehicle(v as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertVehicle(v, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.vehicles.some(x => x.vehicle_id === v.vehicle_id);
        return { vehicles: isUpdate ? state.vehicles.map(x => x.vehicle_id === v.vehicle_id ? v : x) : [...state.vehicles, v] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.VEHICLE, v.vehicle_id, v.plate_no, `${isUpdate ? 'Updated' : 'Registered'} vehicle unit: ${v.plate_no}`, NotificationType.OPERATIONAL);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ المركبة', 'Failed to save vehicle');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.VEHICLE, v.vehicle_id, v.plate_no, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteVehicle: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, vehicles, allTrips } = get();
    const isAr = saasConfig.language === 'ar';
    const hasActiveTrips = allTrips.some(t => t.vehicle_id === id && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED);
    if (hasActiveTrips) {
        const msg = isAr ? 'لا يمكن حذف مركبة مرتبطة برحلات نشطة' : 'Cannot delete a vehicle with active trips';
        toast.error(msg);
        throw new Error(msg);
    }
    const target = vehicles.find(v => v.vehicle_id === id);
    try {
      await api.deleteVehicle(id);
      set(state => ({ vehicles: state.vehicles.filter(x => x.vehicle_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.VEHICLE, id, target?.plate_no || 'Vehicle', `Decommissioned vehicle: ${target?.plate_no || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف المركبة', 'Failed to delete vehicle');
      dispatchSystemEvent(ActionType.DELETED, EntityType.VEHICLE, id, 'Vehicle', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertDriver: async (d, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, drivers } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateDriver(d as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertDriver(d, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.drivers.some(x => x.driver_id === d.driver_id);
        return { drivers: isUpdate ? state.drivers.map(x => x.driver_id === d.driver_id ? d : x) : [...state.drivers, d] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.DRIVER, d.driver_id, d.name, `${isUpdate ? 'Updated' : 'Hired'} workforce: ${d.name}`, NotificationType.SUCCESS);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ السائق', 'Failed to save driver');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.DRIVER, d.driver_id, d.name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteDriver: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, drivers, allTrips } = get();
    const isAr = saasConfig.language === 'ar';
    const hasActiveTrips = allTrips.some(t => t.driver_id === id && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED);
    if (hasActiveTrips) {
        const msg = isAr ? 'لا يمكن حذف سائق مرتبط برحلات نشطة' : 'Cannot delete a driver with active trips';
        toast.error(msg);
        throw new Error(msg);
    }
    const target = drivers.find(d => d.driver_id === id);
    try {
      await api.deleteDriver(id);
      set(state => ({ drivers: state.drivers.filter(x => x.driver_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.DRIVER, id, target?.name || 'Driver', `Terminated contract: ${target?.name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف السائق', 'Failed to delete driver');
      dispatchSystemEvent(ActionType.DELETED, EntityType.DRIVER, id, 'Driver', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertContainer: async (c) => {
    const { api, saasConfig, dispatchSystemEvent, containers } = get();
    const isAr = saasConfig.language === 'ar';
    const validation = validateInventory(c as any);
    if (!validation.valid) {
      const msg = isAr ? validation.errorAr! : validation.errorEn!;
      toast.error(msg);
      throw new Error(msg);
    }
    try {
      await api.upsertContainer(c);
      let isUpdate = false;
      set(state => {
        isUpdate = state.containers.some(x => x.container_id === c.container_id);
        return { containers: isUpdate ? state.containers.map(x => x.container_id === c.container_id ? c : x) : [...state.containers, c] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.CONTAINER, c.container_id, c.code, `${isUpdate ? 'Updated' : 'Added'} container: ${c.code}`, NotificationType.OPERATIONAL);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ الحاوية', 'Failed to save container');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.CONTAINER, c.container_id, c.code, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteContainer: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, containers } = get();
    const target = containers.find(c => c.container_id === id);
    try {
      await api.deleteContainer(id);
      set(state => ({ containers: state.containers.filter(x => x.container_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.CONTAINER, id, target?.code || 'Container', `Scrapped container: ${target?.code || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف الحاوية', 'Failed to delete container');
      dispatchSystemEvent(ActionType.DELETED, EntityType.CONTAINER, id, 'Container', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertTank: async (t) => {
    const { api, saasConfig, dispatchSystemEvent, tanks } = get();
    const isAr = saasConfig.language === 'ar';
    const validation = validateInventory(t as any);
    if (!validation.valid) {
      const msg = isAr ? validation.errorAr! : validation.errorEn!;
      toast.error(msg);
      throw new Error(msg);
    }
    try {
      await api.upsertTank(t);
      let isUpdate = false;
      set(state => {
        isUpdate = state.tanks.some(x => x.tank_id === t.tank_id);
        return { tanks: isUpdate ? state.tanks.map(x => x.tank_id === t.tank_id ? t : x) : [...state.tanks, t] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.TANK, t.tank_id, t.code, `${isUpdate ? 'Updated' : 'Added'} tank: ${t.code}`, NotificationType.OPERATIONAL);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ الخزان', 'Failed to save tank');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.TANK, t.tank_id, t.code, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteTank: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, tanks } = get();
    const target = tanks.find(t => t.tank_id === id);
    try {
      await api.deleteTank(id);
      set(state => ({ tanks: state.tanks.filter(x => x.tank_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.TANK, id, target?.code || 'Tank', `Scrapped tank: ${target?.code || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف الخزان', 'Failed to delete tank');
      dispatchSystemEvent(ActionType.DELETED, EntityType.TANK, id, 'Tank', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertInventorySize: async (s) => {
    const { api, saasConfig, dispatchSystemEvent, inventorySizes } = get();
    try {
      await api.upsertInventorySize(s);
      let isUpdate = false;
      set(state => {
        isUpdate = state.inventorySizes.some(x => x.size_id === s.size_id);
        return { inventorySizes: isUpdate ? state.inventorySizes.map(x => x.size_id === s.size_id ? s : x) : [...state.inventorySizes, s] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.SIZE, s.size_id, s.name, `${isUpdate ? 'Modified' : 'Created'} size: ${s.name}`, NotificationType.SYSTEM);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ حجم المخزون', 'Failed to save size');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.SIZE, s.size_id, s.name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteInventorySize: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, inventorySizes } = get();
    const target = inventorySizes.find(s => s.size_id === id);
    try {
      await api.deleteInventorySize(id);
      set(state => ({ inventorySizes: state.inventorySizes.filter(x => x.size_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.SIZE, id, target?.name || 'Size', `Removed size: ${target?.name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف حجم المخزون', 'Failed to delete size');
      dispatchSystemEvent(ActionType.DELETED, EntityType.SIZE, id, 'Size', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertScale: async (s) => {
    const { api, saasConfig, dispatchSystemEvent, scales } = get();
    try {
      await api.upsertScale(s);
      let isUpdate = false;
      set(state => {
        isUpdate = state.scales.some(x => x.scale_id === s.scale_id);
        return { scales: isUpdate ? state.scales.map(x => x.scale_id === s.scale_id ? s : x) : [...state.scales, s] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.SCALE, s.scale_id, s.code, `${isUpdate ? 'Updated' : 'Activated'} scale: ${s.code}`, NotificationType.OPERATIONAL);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ الميزان', 'Failed to save scale');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.SCALE, s.scale_id, s.code, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteScale: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, scales } = get();
    const target = scales.find(s => s.scale_id === id);
    try {
      await api.deleteScale(id);
      set(state => ({ scales: state.scales.filter(x => x.scale_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.SCALE, id, target?.code || 'Scale', `Decommissioned scale: ${target?.code || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف الميزان', 'Failed to delete scale');
      dispatchSystemEvent(ActionType.DELETED, EntityType.SCALE, id, 'Scale', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertSupplier: async (s, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, suppliers } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateSupplier(s as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertSupplier(s, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.suppliers.some(x => x.supplier_id === s.supplier_id);
        return { suppliers: isUpdate ? state.suppliers.map(x => x.supplier_id === s.supplier_id ? s : x) : [...state.suppliers, s] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.SUPPLIER, s.supplier_id, s.name, `${isUpdate ? 'Updated' : 'Onboarded'} supplier: ${s.name}`, NotificationType.SUCCESS);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ المورد', 'Failed to save supplier');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.SUPPLIER, s.supplier_id, s.name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteSupplier: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, suppliers, vehicles, drivers, allTrips } = get();
    const isAr = saasConfig.language === 'ar';
    const hasVehicles = vehicles.some(v => v.supplier_id === id);
    const hasDrivers = drivers.some(d => d.supplier_id === id);
    if (hasVehicles || hasDrivers) {
        const msg = isAr ? 'لا يمكن حذف مورد مسند له مركبات أو سائقين' : 'Cannot delete supplier with associated vehicles or drivers';
        toast.error(msg);
        throw new Error(msg);
    }
    const supplierDriverIds = drivers.filter(d => d.supplier_id === id).map(d => d.driver_id);
    const supplierVehicleIds = vehicles.filter(v => v.supplier_id === id).map(v => v.vehicle_id);
    const hasActiveTrips = allTrips.some(t => 
       (supplierDriverIds.includes(t.driver_id) || supplierVehicleIds.includes(t.vehicle_id)) 
       && t.status !== TripStatus.COMPLETED && t.status !== TripStatus.CANCELLED
    );
    if (hasActiveTrips) {
        const msg = isAr ? 'لا يمكن حذف مورد مسند لرحلات نشطة' : 'Cannot delete supplier with active trips';
        toast.error(msg);
        throw new Error(msg);
    }
    const target = suppliers.find(s => s.supplier_id === id);
    try {
      await api.deleteSupplier(id);
      set(state => ({ suppliers: state.suppliers.filter(x => x.supplier_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.SUPPLIER, id, target?.name || 'Supplier', `Terminated supplier: ${target?.name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف المورد', 'Failed to delete supplier');
      dispatchSystemEvent(ActionType.DELETED, EntityType.SUPPLIER, id, 'Supplier', msg, NotificationType.ERROR);
      throw err;
    }
  },
  upsertFacility: async (f, skipValidation = false) => {
    const { api, saasConfig, dispatchSystemEvent, facilities } = get();
    const isAr = saasConfig.language === 'ar';
    if (!skipValidation) {
      const validation = validateFacility(f as any);
      if (!validation.valid) {
        const msg = isAr ? validation.errorAr! : validation.errorEn!;
        toast.error(msg);
        throw new Error(msg);
      }
    }
    try {
      await api.upsertFacility(f, skipValidation);
      let isUpdate = false;
      set(state => {
        isUpdate = state.facilities.some(x => x.facility_id === f.facility_id);
        return { facilities: isUpdate ? state.facilities.map(x => x.facility_id === f.facility_id ? f : x) : [...state.facilities, f] };
      });
      dispatchSystemEvent(isUpdate ? ActionType.UPDATED : ActionType.CREATED, EntityType.FACILITY, f.facility_id, f.name, `${isUpdate ? 'Updated' : 'Registered'} facility: ${f.name}`, NotificationType.SUCCESS);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حفظ المنشأة', 'Failed to save facility');
      dispatchSystemEvent(ActionType.UPDATED, EntityType.FACILITY, f.facility_id, f.name, msg, NotificationType.ERROR);
      throw err;
    }
  },
  deleteFacility: async (id) => {
    const { api, saasConfig, dispatchSystemEvent, facilities } = get();
    const target = facilities.find(f => f.facility_id === id);
    try {
      await api.deleteFacility(id);
      set(state => ({ facilities: state.facilities.filter(x => x.facility_id !== id) }));
      dispatchSystemEvent(ActionType.DELETED, EntityType.FACILITY, id, target?.name || 'Facility', `Removed facility: ${target?.name || id}`, NotificationType.WARNING);
    } catch (err) {
      const msg = getBilingualError(err, saasConfig.language === 'ar', 'فشل حذف المنشأة', 'Failed to delete facility');
      dispatchSystemEvent(ActionType.DELETED, EntityType.FACILITY, id, 'Facility', msg, NotificationType.ERROR);
      throw err;
    }
  },
  markAllNotificationsRead: async () => {
    const { api } = get();
    try {
      set(state => ({ notifications: state.notifications.map(n => ({ ...n, isRead: true })) }));
      await api.markAllNotificationsRead();
    } catch (e) { console.error(e); }
  },
  deleteAllNotifications: async () => {
    const { api } = get();
    try {
      set({ notifications: [] });
      await api.deleteAllNotifications();
    } catch (e) { console.error(e); }
  },
  requestAddition: async (type, data) => {
    const { api, addNotification, currentUser, saasConfig, assetRequests } = get();
    const isAr = saasConfig.language === 'ar';

    const typeNames = {
      VEHICLE: isAr ? 'مركبة' : 'Vehicle',
      DRIVER: isAr ? 'سائق' : 'Driver',
      CONTAINER: isAr ? 'حاوية' : 'Container',
      TANK: isAr ? 'خزان' : 'Tank'
    };

    try {
      // 1. Persist to DB
      const result = await api.upsertAssetRequest({
        supplier_id: currentUser.supplier_id,
        type,
        data,
        status: RequestStatus.PENDING
      });

      if (result && (result.id || result.status === 'success')) {
        // Fetch latest requests to be sure or just append if result is full object
        const newReq = result.id ? result : result.data;
        if (newReq) {
          set({ assetRequests: [newReq, ...assetRequests] });
        }
      }

      // 2. Notify Admins
      await addNotification({
        title: isAr ? 'طلب إضافة جديد' : 'New Addition Request',
        message: isAr
          ? `طلب المورد (${currentUser.name}) إضافة ${typeNames[type]}: ${data.plate_no || data.name || data.code || ''}`
          : `Subcontractor (${currentUser.name}) requested adding a ${typeNames[type]}: ${data.plate_no || data.name || data.code || ''}`,
        type: NotificationType.INFO,
      });

      toast.success(isAr
        ? 'تم إرسال طلبك للجهات المختصة. يمكنك متابعة حالة الطلب من تبويب "الطلبات".'
        : 'Your request has been sent to the authorities. You can track its status in the "Requests" tab.');
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'فشل إرسال الطلب' : 'Failed to send request');
    }
  },
  processAssetRequest: async (id, status, notes) => {
    const { api, assetRequests, suppliers, upsertVehicle, upsertDriver, upsertContainer, upsertTank } = get();
    try {
      const target = assetRequests.find(r => r.id === id);
      if (!target) return;

      const nextNotes = notes || target.notes;
      const updatedReq = {
        ...target,
        status,
        ...(nextNotes ? { notes: nextNotes } : {})
      };
      await api.upsertAssetRequest(updatedReq);
      set({ assetRequests: assetRequests.map(r => r.id === id ? updatedReq : r) });

      if (status === RequestStatus.APPROVED) {
        const data = target.data;
        const sId = target.supplier_id;
        const supplier = suppliers.find(s => s.supplier_id === sId);
        const sName = supplier?.name || '';
        const ts = Date.now().toString().slice(-6);

        switch (target.type) {
          case 'VEHICLE':
            await upsertVehicle({
              vehicle_id: `V-${ts}`,
              plate_no: data.plate_no,
              vehicle_type: data.vehicle_type,
              model: data.model,
              ownership_type: 'SUPPLIER',
              supplier_id: sId,
              supplier_name: sName,
              status: 'ACTIVE'
            } as any);
            break;
          case 'DRIVER':
            await upsertDriver({
              driver_id: `D-${ts}`,
              name: data.name,
              phone: data.phone,
              license_no: data.license_no,
              iqama_no: data.iqama_no,
              supplier_id: sId,
              supplier_name: sName,
              status: 'ACTIVE'
            } as any);
            break;
          case 'CONTAINER':
            await upsertContainer({
              container_id: `C-${ts}`,
              code: data.code,
              size_id: data.size_id,
              supplier_id: sId,
              supplier_name: sName,
              status: 'ACTIVE'
            } as any);
            break;
          case 'TANK':
            await upsertTank({
              tank_id: `T-${ts}`,
              code: data.code,
              size_id: data.size_id,
              supplier_id: sId,
              supplier_name: sName,
              status: 'ACTIVE'
            } as any);
            break;
        }
      }
    } catch (err) {
      console.error('Failed to process asset request', err);
      throw err;
    }
  },
  updateSaaS: async (c) => {
    const { saasConfig, syncSaasConfig } = get();
    const next = { ...saasConfig, ...c };
    set({ saasConfig: next });
    await syncSaasConfig(next);
  },
  updateLandingPage: async (c: any) => {
    const { saasConfig, syncSaasConfig } = get();
    // Defensive check: ensure landingPage is an object before spreading
    const currentLP = typeof saasConfig.landingPage === 'string' ? {} : (saasConfig.landingPage || {});
    const next = {
      ...saasConfig,
      landingPage: { ...currentLP, ...c }
    };
    set({ saasConfig: next });
    syncSaasConfig(next);
  },
  updateStorePage: async (c: any) => {
    const { saasConfig, syncSaasConfig } = get();
    // Defensive check: ensure storePage is an object before spreading
    const currentSP = typeof saasConfig.storePage === 'string' ? {} : (saasConfig.storePage || {});
    const next = {
      ...saasConfig,
      storePage: { ...currentSP, ...c }
    };
    set({ saasConfig: next });
    syncSaasConfig(next);
  },
  upsertEquipment: async (eq: any) => {
    const { api, environmentalEquipments } = get();
    try {
      await api.upsertEquipment(eq);
      let isUpdate = false;
      set(state => {
        isUpdate = state.environmentalEquipments.some(x => x.equipment_id === eq.equipment_id);
        return {
          environmentalEquipments: isUpdate
            ? state.environmentalEquipments.map(x => x.equipment_id === eq.equipment_id ? eq : x)
            : [{ ...eq, created_at: eq.created_at || new Date().toISOString() }, ...state.environmentalEquipments]
        };
      });
    } catch (err) { console.error('[upsertEquipment]', err); }
  },
  deleteEquipment: async (id: string) => {
    const { api, environmentalEquipments } = get();
    try {
      await api.deleteEquipment(id);
      set({ environmentalEquipments: environmentalEquipments.filter(x => x.equipment_id !== id) });
    } catch (err) { console.error('[deleteEquipment]', err); }
  },
  updateEquipmentInquiry: async (id: string | number, data: any) => {
    const { api, equipmentInquiries } = get();
    try {
      await api.updateEquipmentInquiry(String(id), data);
      set({ equipmentInquiries: equipmentInquiries.map(x => x.id === id ? data : x) });
    } catch (err) { console.error('[updateEquipmentInquiry]', err); }
  },
  deleteEquipmentInquiry: async (id: string | number) => {
    const { api, equipmentInquiries } = get();
    try {
      await api.deleteEquipmentInquiry(String(id));
      set({ equipmentInquiries: equipmentInquiries.filter(x => x.id !== id) });
    } catch (err) { console.error('[deleteEquipmentInquiry]', err); }
  },
  submitEquipmentInquiry: async (data: any) => {
    const { api, equipmentInquiries } = get();
    try {
      const res = await api.submitEquipmentInquiry(data);
      set({
        equipmentInquiries: [{ ...data, id: res?.id || Date.now(), status: 'PENDING', created_at: new Date().toISOString() }, ...equipmentInquiries]
      });
    } catch (err) { console.error('[submitEquipmentInquiry]', err); }
  },
  shareEquipment: async (id: string) => {
    const { api, environmentalEquipments } = get();
    try {
      await api.shareEquipment(id);
      set({
        environmentalEquipments: environmentalEquipments.map(x =>
          x.equipment_id === id ? { ...x, share_count: (x.share_count || 0) + 1 } : x
        )
      });
    } catch (err) { console.error('[shareEquipment]', err); }
  }
}));

/**
 * [AR] مكون تهيئة النظام - [EN] Store Initializer Component
 */
export const StoreInitializer: React.FC = () => {
  const store = useGCMStore();
  const initialLoadDone = useRef(false);
  const syncChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    syncChannel.current = new BroadcastChannel('gcm_sync');
    syncChannel.current.onmessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'COMPANY_UPDATED': store.setCompanies(store.companies.map(c => c.company_id === data.company_id ? data : c)); break;
        case 'PROJECT_UPDATED': store.setAllProjects(store.allProjects.map(p => p.project_id === data.project_id ? data : p)); break;
        case 'TRIP_UPDATED': store.setAllTrips([data, ...store.allTrips.filter(t => t.trip_id !== data.trip_id)]); break;
        case 'RELOAD_ALL': store.loadAllData(); break;
      }
    };
    return () => { syncChannel.current?.close(); };
  }, [store]);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const boot = async () => {
      console.log("🚀 [GCM] Initializing Engine Boot Sequence...");
      try {
        const config = await store.api.getConfig().catch((err) => {
          console.warn("⚠️ [GCM] Config fetch failed, using defaults:", err);
          return null;
        });

        if (config) {
          console.log("✅ [GCM] System Config Loaded");
          // [AR] تحويل الأسماء من snake_case (API) إلى camelCase (Store)
          // [EN] Map snake_case from API to camelCase for the Store state
          store.setSaasConfig(mapSystemConfigToSaaSConfig(config));
        }

        const session = localStorage.getItem('gcm_auth_session') === 'true';
        const savedUserStr = localStorage.getItem('gcm_current_user');

        if (session && savedUserStr) {
          console.log("🔑 [GCM] Restoring Session...");
          try {
            const u = JSON.parse(savedUserStr);
            store.setCurrentUser(u);
            store.setIsAuthenticated(true);
            console.log("📊 [GCM] Loading Global Data...");
            await store.loadAllData();

            // [AR] تحديث بيانات الملف الشخصي لضمان الـ Role الحالية من السيرفر
            // [EN] Refresh profile data to ensure current Role from server
            const freshUser = store.users.find((user: any) => user.id === u.id);
            if (freshUser) {
              console.log("👤 [GCM] Profile Refreshed from Server");
              store.setCurrentUser({ ...u, ...freshUser });
              localStorage.setItem('gcm_current_user', JSON.stringify({ ...u, ...freshUser }));
            }
          } catch (e) {
            console.error("❌ [GCM] Session Restoration Failed:", e);
            localStorage.removeItem('gcm_auth_session');
            localStorage.removeItem('gcm_current_user');
          }
        }
      } catch (err) {
        console.error("🚨 [GCM] Boot Error:", err);
      } finally {
        console.log("🏁 [GCM] Engine Ready.");
        store.setBooting(false);
      }
    };
    boot();
  }, [store]);

  useEffect(() => {
    if (store.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [store.darkMode]);

  return null;
};

/**
 * [AR] الخطاف البرمجي للتوافق
 */
export const useAppStore = () => {
  const store = useGCMStore();

  const filteredProjects = useMemo(() => {
    const { currentUser, allProjects } = store;
    if (currentUser.role === Role.DEACTIVATED) return [];
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.LOGISTICS || currentUser.role === Role.ACCOUNTANT || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.USER || currentUser.role === Role.STAFF) {
      if (currentUser.company_id) return allProjects.filter(p => p.company_id === currentUser.company_id);
      return allProjects;
    }

    if (currentUser.role === Role.COMPANY_USER || currentUser.role === Role.CLIENT) return allProjects.filter(p => p.company_id === (currentUser.company_id || ''));
    if (currentUser.role === Role.PROJECT_USER) return allProjects.filter(p => p.project_id === currentUser.project_id);
    if (currentUser.role === Role.DRIVER) {
      // [AR] السماح للسائق برؤية جميع المشاريع النشطة ليتمكن من تسجيل مهام جديدة
      // [EN] Allow driver to see all active projects to enable registering new missions
      return allProjects.filter(p => p.status === 'ACTIVE');
    }
    return [];
  }, [store.allProjects, store.currentUser, store.drivers, store.allTrips]);

  const filteredTrips = useMemo(() => {
    const { currentUser, allTrips } = store;
    if (currentUser.role === Role.DEACTIVATED) return [];

    const getTripCompanyId = (t: any) => t.company_id || t._company_id || store.allProjects.find(p => p.project_id === t.project_id)?.company_id;

    if (currentUser.role === Role.ADMIN || currentUser.role === Role.LOGISTICS || currentUser.role === Role.ACCOUNTANT || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.USER || currentUser.role === Role.STAFF) {
      if (currentUser.company_id) return allTrips.filter(t => getTripCompanyId(t) === currentUser.company_id);
      return allTrips;
    }

    if (currentUser.role === Role.COMPANY_USER || currentUser.role === Role.CLIENT) return allTrips.filter(t => getTripCompanyId(t) === (currentUser.company_id || ''));
    if (currentUser.role === Role.PROJECT_USER) return allTrips.filter(t => t.project_id === (currentUser.project_id || ''));
    if (currentUser.role === Role.DRIVER) {
      const myDriver = store.drivers.find(d =>
        d.user_id === currentUser.id ||
        d.driver_id === currentUser.id ||
        d.name === currentUser.name
      );

      const myTrips = allTrips.filter(t =>
        t.driver_id === myDriver?.driver_id ||
        t.driver_id === currentUser.id ||
        t.driver_id === currentUser.name
      );

      return myTrips;
    }
    if (currentUser.role === Role.SUBCONTRACTOR) {
      if (!currentUser.supplier_id) return [];
      return allTrips.filter(t => {
        const vehicle = store.vehicles.find(v => v.vehicle_id === t.vehicle_id);
        return vehicle?.supplier_id === currentUser.supplier_id;
      });
    }

    // Final fallback for safety - ensure we have at least one ID to filter by
    if (currentUser.project_id) return allTrips.filter(t => t.project_id === currentUser.project_id);
    if (currentUser.company_id) return allTrips.filter(t => getTripCompanyId(t) === currentUser.company_id);
    return [];
  }, [store.allTrips, store.currentUser, store.drivers, store.vehicles, store.allProjects]);

  const filteredVehicles = useMemo(() => {
    const { currentUser, vehicles } = store;
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.DRIVER || currentUser.role === Role.LOGISTICS || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.STAFF) return vehicles;
    if (currentUser.role === Role.SUBCONTRACTOR) return vehicles.filter(v => v.supplier_id === currentUser.supplier_id);
    if (currentUser.role === Role.COMPANY_USER || currentUser.role === Role.PROJECT_USER || currentUser.role === Role.CLIENT) {
      const myVehicleIds = new Set(filteredTrips.map(t => t.vehicle_id));
      return vehicles.filter(v => myVehicleIds.has(v.vehicle_id));
    }
    return [];
  }, [store.vehicles, store.currentUser, filteredTrips]);

  const filteredDrivers = useMemo(() => {
    const { currentUser, drivers } = store;
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.LOGISTICS || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.STAFF) return drivers;
    if (currentUser.role === Role.DRIVER) return drivers.filter(d =>
      d.user_id === currentUser.id ||
      (currentUser.name && d.name && d.name.toLowerCase() === currentUser.name.toLowerCase()) ||
      (currentUser.phone && d.phone && d.phone === currentUser.phone) ||
      d.driver_id === currentUser.id
    );
    if (currentUser.role === Role.SUBCONTRACTOR) return drivers.filter(d => d.supplier_id === currentUser.supplier_id);
    if (currentUser.role === Role.COMPANY_USER || currentUser.role === Role.PROJECT_USER || currentUser.role === Role.CLIENT) {
      const myDriverIds = new Set(filteredTrips.map(t => t.driver_id));
      return drivers.filter(d => myDriverIds.has(d.driver_id));
    }
    return [];
  }, [store.drivers, store.currentUser, filteredTrips]);

  const filteredContainers = useMemo(() => {
    const { currentUser, containers } = store;
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.DRIVER || currentUser.role === Role.LOGISTICS || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.STAFF) return containers;
    if (currentUser.role === Role.SUBCONTRACTOR) return containers.filter(c => c.supplier_id === currentUser.supplier_id);
    return [];
  }, [store.containers, store.currentUser]);

  const filteredTanks = useMemo(() => {
    const { currentUser, tanks } = store;
    if (currentUser.role === Role.ADMIN || currentUser.role === Role.DRIVER || currentUser.role === Role.LOGISTICS || currentUser.role === Role.DATA_ENTRY || currentUser.role === Role.REPORTS_MANAGER || currentUser.role === Role.STAFF) return tanks;
    if (currentUser.role === Role.SUBCONTRACTOR) return tanks.filter(t => t.supplier_id === currentUser.supplier_id);
    return [];
  }, [store.tanks, store.currentUser]);
  return {
    ...store,
    projects: filteredProjects,
    trips: filteredTrips,
    vehicles: filteredVehicles,
    drivers: filteredDrivers,
    containers: filteredContainers,
    tanks: filteredTanks
  };
};

export const useBranding = (saasConfig: any, darkMode: boolean) => {
  useEffect(() => {
    const isAr = saasConfig.language === 'ar';
    const appName = isAr ? saasConfig.appNameAr : saasConfig.appNameEn;
    if (appName) document.title = appName;
    const logo = (darkMode && saasConfig.logoDarkUrl) ? saasConfig.logoDarkUrl : saasConfig.logoUrl;
    if (logo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link'); link.rel = 'icon';
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head) head.appendChild(link);
      }
      link.href = logo;
    }
  }, [saasConfig, darkMode]);
};
