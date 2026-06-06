
import { ENDPOINTS, buildApiUrl } from './endpoints';
import { getClientAuthHeaders } from '@/lib/clientAuth';
import { broadcastMutationInvalidation } from '@/lib/clientSync';
import { validateCriticalApiResponse } from '@/lib/responseSchemas';
import { sanitizeSessionUser } from '@/features/auth/model/sanitizeSessionUser';

type BaseUrlResolver = string | (() => string);
type ApiPayload = object;
type RuntimeWindow = Window & { GCM_CONFIG?: { API_BASE_URL?: string } };

const resolveRuntimeBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_BASE_URL || '';
    }

    const runtimeUrl = (window as RuntimeWindow).GCM_CONFIG?.API_BASE_URL;
    if (typeof runtimeUrl === 'string' && runtimeUrl) {
        return runtimeUrl;
    }

    const storedUrl = window.localStorage.getItem('gcm_api_url');
    if (storedUrl) {
        return storedUrl;
    }

    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
};

/**
 * [AR] خطأ API مخصص — يحمل رسائل ثنائية اللغة من السيرفر
 * [EN] Custom API Error — carries bilingual messages from the server
 */
export class ApiError extends Error {
    messageAr: string;
    messageEn: string;
    statusCode: number;
    field?: string;
    code?: string;
    allErrors?: Array<{ errorAr: string; errorEn: string; field?: string }>;

    constructor(data: {
        error?: string; errorAr?: string; errorEn?: string;
        field?: string; code?: string;
        allErrors?: Array<{ errorAr: string; errorEn: string; field?: string }>;
    }, statusCode: number) {
        super(data.error || data.errorEn || data.errorAr || 'Unknown error');
        this.messageAr = data.errorAr || 'حدث خطأ غير متوقع';
        this.messageEn = data.errorEn || data.error || 'An unexpected error occurred';
        this.statusCode = statusCode;
        if (data.field !== undefined) this.field = data.field;
        if (data.code !== undefined) this.code = data.code;
        if (data.allErrors !== undefined) this.allErrors = data.allErrors;
    }
}

/**
 * [AR] خدمة الاتصال بالسيرفر (API Client)
 * [EN] API Client Service for Backend Communication
 */
export const createApiClient = (baseUrl: BaseUrlResolver = '') => {
    const getResolvedBaseUrl = () => {
        const resolved = typeof baseUrl === 'function' ? baseUrl() : baseUrl;
        return resolved || resolveRuntimeBaseUrl();
    };

    const request = async (endpoint: string, options: RequestInit = {}) => {
        const url = buildApiUrl(getResolvedBaseUrl(), endpoint);
        const headers: HeadersInit = {
            ...options.headers,
            ...getClientAuthHeaders(),
        };

        if (options.body !== undefined && !('Content-Type' in headers)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: options.credentials ?? 'include',
        });

        if (!response.ok) {
            // [AR] قراءة جسم الرد للحصول على الأخطاء ثنائية اللغة
            let errorData: ApiPayload = {};
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: response.statusText };
            }
            throw new ApiError(errorData, response.status);
        }

        const data = await response.json();
        try {
            return validateCriticalApiResponse(endpoint, data);
        } catch (validationError) {
            throw new ApiError(
                {
                    errorAr: 'استجابة غير متوقعة من الخادم',
                    errorEn: 'Unexpected server response payload',
                    error: validationError instanceof Error ? validationError.message : 'Response validation failed',
                },
                500,
            );
        }
    };

    const requestServerWrite = async (
        endpoint: string,
        options: RequestInit = {},
        mutationScope?:
            | "companies"
            | "projects"
            | "trips"
            | "services"
            | "vehicles"
            | "drivers"
            | "suppliers"
            | "facilities",
    ) => {
        const headers: HeadersInit = {
            ...options.headers,
            ...getClientAuthHeaders(),
        };

        if (options.body !== undefined && !('Content-Type' in headers)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const response = await fetch(endpoint, {
            ...options,
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            let errorData: ApiPayload = {};
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: response.statusText };
            }
            throw new ApiError(errorData, response.status);
        }

        const data = await response.json();
        if (mutationScope) {
            broadcastMutationInvalidation(mutationScope);
        }
        return data;
    };

    return {
        // Companies
        getCompanies: () => request(ENDPOINTS.COMPANIES.BASE),
        upsertCompany: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/companies', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'companies'),
        deleteCompany: (id: string) => requestServerWrite(`/api/write/companies/${id}`, { method: 'DELETE' }, 'companies'),

        // Projects
        getProjects: () => request(ENDPOINTS.PROJECTS.BASE),
        upsertProject: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/projects', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'projects'),
        deleteProject: (id: string) => requestServerWrite(`/api/write/projects/${id}`, { method: 'DELETE' }, 'projects'),

        // Project Services
        getProjectServices: () => request('/api/v1/project_services'),
        upsertProjectService: (data: ApiPayload) => request('/api/v1/project_services', { method: 'POST', body: JSON.stringify(data) }),
        deleteProjectService: (id: string) => request(`/api/v1/project_services/${id}`, { method: 'DELETE' }),

        // Trips
        getTrips: () => request(ENDPOINTS.TRIPS.BASE),
        upsertTrip: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/trips', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'trips'),
        deleteTrip: (id: string) => requestServerWrite(`/api/write/trips/${id}`, { method: 'DELETE' }, 'trips'),

        // Users
        getUsers: () => request(ENDPOINTS.SYSTEM.USERS),
        upsertUser: (data: ApiPayload) => request(ENDPOINTS.SYSTEM.USERS, { method: 'POST', body: JSON.stringify(data) }),
        deleteUser: (id: string) => request(`${ENDPOINTS.SYSTEM.USERS}/${id}`, { method: 'DELETE' }),
        login: async (credentials: ApiPayload) => {
            const payload = await request(ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: JSON.stringify(credentials) });
            if (!payload || typeof payload !== 'object') {
                return payload;
            }

            return sanitizeSessionUser(payload as Parameters<typeof sanitizeSessionUser>[0]);
        },
        logout: () => request(ENDPOINTS.AUTH.LOGOUT, { method: 'POST' }),

        // SaaS Config
        getConfig: () => request('/api/v1/config'),
        upsertConfig: (data: ApiPayload) => request('/api/v1/config', { method: 'POST', body: JSON.stringify(data) }),

        // Services
        getServices: () => request(ENDPOINTS.SERVICES.BASE),
        upsertService: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/services', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'services'),
        deleteService: (id: string) => requestServerWrite(`/api/write/services/${id}`, { method: 'DELETE' }, 'services'),

        // Vehicles
        getVehicles: () => request(ENDPOINTS.FLEET.VEHICLES),
        upsertVehicle: async (data: ApiPayload, skipValidation?: boolean) => {
            // [PERF] Document uniqueness is enforced server-side via DB constraints.
            // Client-side validation for empty required fields only.
            const vehicleData = data as { documents?: Array<{ type?: string; expiry_date?: string }> };
            if (!skipValidation && vehicleData.documents && Array.isArray(vehicleData.documents)) {
                const typesInPayload = new Set<string>();
                for (const doc of vehicleData.documents) {
                    const docType = doc.type || 'UNKNOWN';
                    if (typesInPayload.has(docType)) {
                        throw new Error(`Error: المستند موجود بالفعل للسيارة دي [${docType}]`);
                    }
                    typesInPayload.add(docType);
                    if (!doc.expiry_date) {
                        throw new Error(`Error: تاريخ الانتهاء مطلوب للمستند [${docType}]`);
                    }
                }
            }
            return requestServerWrite('/api/write/vehicles', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'vehicles');
        },
        deleteVehicle: (id: string) => requestServerWrite(`/api/write/vehicles/${id}`, { method: 'DELETE' }, 'vehicles'),

        // Drivers
        getDrivers: () => request(ENDPOINTS.FLEET.DRIVERS),
        upsertDriver: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/drivers', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'drivers'),
        deleteDriver: (id: string) => requestServerWrite(`/api/write/drivers/${id}`, { method: 'DELETE' }, 'drivers'),

        // Inventory
        getContainers: () => request('/api/v1/inventory/containers'),
        upsertContainer: (data: ApiPayload) => request('/api/v1/inventory/containers', { method: 'POST', body: JSON.stringify(data) }),
        deleteContainer: (id: string) => request(`/api/v1/inventory/containers/${id}`, { method: 'DELETE' }),
        getTanks: () => request('/api/v1/inventory/tanks'),
        upsertTank: (data: ApiPayload) => request('/api/v1/inventory/tanks', { method: 'POST', body: JSON.stringify(data) }),
        deleteTank: (id: string) => request(`/api/v1/inventory/tanks/${id}`, { method: 'DELETE' }),
        getInventorySizes: () => request('/api/v1/inventory/sizes'),
        upsertInventorySize: (data: ApiPayload) => request('/api/v1/inventory/sizes', { method: 'POST', body: JSON.stringify(data) }),
        deleteInventorySize: (id: string) => request(`/api/v1/inventory/sizes/${id}`, { method: 'DELETE' }),

        // Scales
        getScales: () => request('/api/v1/inventory/scales'),
        upsertScale: (data: ApiPayload) => request('/api/v1/inventory/scales', { method: 'POST', body: JSON.stringify(data) }),
        deleteScale: (id: string) => request(`/api/v1/inventory/scales/${id}`, { method: 'DELETE' }),

        // Logs
        getLogs: () => request(ENDPOINTS.SYSTEM.LOGS),
        addLog: (logData: ApiPayload) => request(ENDPOINTS.SYSTEM.LOGS, { method: 'POST', body: JSON.stringify(logData) }),

        // Notifications
        getNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE),
        addNotification: (data: ApiPayload) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'POST', body: JSON.stringify(data) }),
        markNotificationRead: (id: string) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.MARK_READ(id), { method: 'PATCH' }), // Backend forces TRUE currently
        markAllNotificationsRead: () => request(`${ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE}/read-all`, { method: 'PATCH' }),
        deleteAllNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'DELETE' }),
        deleteNotification: (id: string) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BY_ID(id), { method: 'DELETE' }),

        // Permission Requests
        getPermissionRequests: () => request('/api/v1/permission-requests'),
        upsertPermissionRequest: (data: ApiPayload) => request('/api/v1/permission-requests', { method: 'POST', body: JSON.stringify(data) }),
        deletePermissionRequest: (id: string) => request(`/api/v1/permission-requests/${id}`, { method: 'DELETE' }),

        // Contact Submissions
        getContactSubmissions: () => request('/api/v1/contact-submissions'),
        addContactSubmission: (data: ApiPayload) => request('/api/v1/contact-submissions', { method: 'POST', body: JSON.stringify(data) }),
        deleteContactSubmission: (id: string) => request(`/api/v1/contact-submissions/${id}`, { method: 'DELETE' }),

        // Environmental Equipments (E-Commerce)
        getEquipments: () => request('/api/v1/public/store/equipments'),
        getEquipmentDetail: (id: string) => request(`/api/v1/public/store/equipments/${id}`),
        upsertEquipment: (data: ApiPayload) => request('/api/v1/public/store/equipments', { method: 'POST', body: JSON.stringify(data) }),
        deleteEquipment: (id: string) => request(`/api/v1/public/store/equipments/${id}`, { method: 'DELETE' }),
        shareEquipment: (id: string) => request(`/api/v1/public/store/equipments/${id}/share`, { method: 'POST' }),

        // Equipment Inquiries
        getEquipmentInquiries: () => request('/api/v1/public/store/inquiries'),
        submitEquipmentInquiry: (data: ApiPayload) => request('/api/v1/public/store/inquiries', { method: 'POST', body: JSON.stringify(data) }),
        updateEquipmentInquiry: (id: string, data: ApiPayload) => request(`/api/v1/public/store/inquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteEquipmentInquiry: (id: string) => request(`/api/v1/public/store/inquiries/${id}`, { method: 'DELETE' }),

        getSuppliers: () => request('/api/v1/suppliers'),
        upsertSupplier: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/suppliers', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'suppliers'),
        deleteSupplier: (id: string) => requestServerWrite(`/api/write/suppliers/${id}`, { method: 'DELETE' }, 'suppliers'),

        // Facilities
        getFacilities: () => request('/api/v1/facilities'),
        upsertFacility: (data: ApiPayload, skipValidation?: boolean) => requestServerWrite('/api/write/facilities', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'facilities'),
        deleteFacility: (id: string) => requestServerWrite(`/api/write/facilities/${id}`, { method: 'DELETE' }, 'facilities'),

        // AI Sessions
        logAISession: (data: ApiPayload) => request(ENDPOINTS.AI.LOG_SESSION, { method: 'POST', body: JSON.stringify(data) }),
        getAISessions: (params?: Record<string, string>) => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            return request(`${ENDPOINTS.AI.SESSIONS}${qs}`);
        },
        getAISessionById: (id: string) => request(ENDPOINTS.AI.SESSION_BY_ID(id)),
        getAIAnalytics: () => request(ENDPOINTS.AI.ANALYTICS),
        rateAISession: (id: string, data: { rating?: number; flagged?: boolean }) => request(ENDPOINTS.AI.RATE_SESSION(id), { method: 'PATCH', body: JSON.stringify(data) }),
        chatWithAI: (messages: unknown[], context: unknown) => request(ENDPOINTS.AI.CHAT, { method: 'POST', body: JSON.stringify({ messages, context }) }),

        // Asset Requests
        getAssetRequests: () => request('/api/v1/asset_requests'),
        upsertAssetRequest: (data: ApiPayload) => request('/api/v1/asset_requests', { method: 'POST', body: JSON.stringify(data) }),

        // Asset Service Links (N:N)
        getAssetServiceLinks: () => request('/api/v1/asset-service-links'),
        syncAssetServiceLinks: (assetType: string, assetId: string, serviceIds: string[]) =>
            request(`/api/asset-service-links/${assetType}/${assetId}`, { method: 'PUT', body: JSON.stringify({ service_ids: serviceIds }) }),

        // AI OCR
        processOcrVision: (base64: string) => request('/api/v1/ai/ocr/vision', { method: 'POST', body: JSON.stringify({ image: base64 }) }),

        // System
        getSystemMetrics: () => request('/api/v1/system/metrics'),
        getWhatsappStatus: () => request('/api/v1/system/whatsapp/qr'),
        getBackupStatus: () => request('/api/v1/system/backup/status'),
        restoreBackup: (file: File) => {
            const formData = new FormData();
            formData.append('backup_file', file);
            
            const url = buildApiUrl(getResolvedBaseUrl(), '/api/v1/system/backup/restore');
            const headers = getClientAuthHeaders();
            
            return fetch(url, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: formData
            }).then(res => res.json().then(data => res.ok ? data : Promise.reject(data)));
        },
    };
};
