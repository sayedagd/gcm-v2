
import { ENDPOINTS, buildApiUrl } from './endpoints';
import { getClientAuthHeaders } from '@/lib/clientAuth';
import { broadcastMutationInvalidation } from '@/lib/clientSync';
import { validateCriticalApiResponse } from '@/lib/responseSchemas';
import { sanitizeSessionUser } from '@/features/auth/model/sanitizeSessionUser';
import { HttpResponseError, performHttpJsonRequest } from '@/api/http';
import type { paths } from '@/api/generated/openapi.types';

type BaseUrlResolver = string | (() => string);
type JsonObjectPayload = unknown;
type RuntimeWindow = Window & { GCM_CONFIG?: { API_BASE_URL?: string } };

type StripIndexSignature<T> = {
    [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

type CompanyUpsertPayload = StripIndexSignature<paths['/api/v1/companies']['post']['requestBody']['content']['application/json']>;
type ProjectUpsertPayload = StripIndexSignature<paths['/api/v1/projects']['post']['requestBody']['content']['application/json']>;
type TripUpsertBasePayload = StripIndexSignature<paths['/api/v1/trips']['post']['requestBody']['content']['application/json']>;
type TripUpsertPayload = TripUpsertBasePayload & { project_id?: string; status?: string };
type UserUpsertPayload = StripIndexSignature<paths['/api/v1/users']['post']['requestBody']['content']['application/json']>;
type LoginBasePayload = StripIndexSignature<paths['/api/v1/auth/login']['post']['requestBody']['content']['application/json']>;
type LoginRequestPayload = Pick<LoginBasePayload, 'email'> & { password?: LoginBasePayload['password'] | undefined };
type ConfigUpsertPayload = StripIndexSignature<paths['/api/v1/config']['post']['requestBody']['content']['application/json']>;
type ServiceUpsertPayload = StripIndexSignature<paths['/api/v1/services']['post']['requestBody']['content']['application/json']>;
type VehicleUpsertPayload = StripIndexSignature<paths['/api/v1/vehicles']['post']['requestBody']['content']['application/json']>;
type DriverUpsertPayload = StripIndexSignature<paths['/api/v1/drivers']['post']['requestBody']['content']['application/json']>;
type SupplierUpsertPayload = StripIndexSignature<paths['/api/v1/suppliers']['post']['requestBody']['content']['application/json']>;
type FacilityUpsertBasePayload = StripIndexSignature<paths['/api/v1/facilities']['post']['requestBody']['content']['application/json']>;
type FacilityUpsertPayload = FacilityUpsertBasePayload & { name?: string };

const LEGACY_ENDPOINT_ALLOW_PREFIXES: string[] = [];

const isAllowedApiPath = (endpoint: string) => {
    if (!endpoint.startsWith('/api/')) {
        return true;
    }

    if (endpoint.startsWith('/api/v1/') || endpoint.startsWith('/api/write/')) {
        return true;
    }

    return false;
};

const isUsableRuntimeApiUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        const isLocalHost = host === 'localhost' || host === '127.0.0.1';
        const isProdHost = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

        // Ignore stale localhost overrides when running on real deployed hosts.
        if (isProdHost && isLocalHost) {
            return false;
        }

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol !== 'https:') {
            return false;
        }

        return true;
    } catch {
        return false;
    }
};

const resolveRuntimeBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_BASE_URL || '';
    }

    const runtimeUrl = (window as RuntimeWindow).GCM_CONFIG?.API_BASE_URL;
    if (typeof runtimeUrl === 'string' && runtimeUrl && isUsableRuntimeApiUrl(runtimeUrl)) {
        return runtimeUrl;
    }

    const storedUrl = window.localStorage.getItem('gcm_api_url');
    if (storedUrl && isUsableRuntimeApiUrl(storedUrl)) {
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

type ApiErrorInput = ConstructorParameters<typeof ApiError>[0];

/**
 * [AR] خدمة الاتصال بالسيرفر (API Client)
 * [EN] API Client Service for Backend Communication
 */
export const createApiClient = (baseUrl: BaseUrlResolver = '') => {
    const getResolvedBaseUrl = () => {
        const resolved = typeof baseUrl === 'function' ? baseUrl() : baseUrl;
        return resolved || resolveRuntimeBaseUrl();
    };

    const enforceEndpointPolicy = (endpoint: string) => {
        if (isAllowedApiPath(endpoint)) {
            return;
        }

        throw new ApiError(
            {
                errorAr: 'تم حظر المسار بسبب سياسة نسخة واجهة البرمجة',
                errorEn: 'Endpoint blocked by v1 API policy',
                error: `Disallowed endpoint path: ${endpoint}`,
                code: 'ENDPOINT_POLICY_VIOLATION',
            },
            500,
        );
    };

    const request = async (endpoint: string, options: RequestInit = {}) => {
        enforceEndpointPolicy(endpoint);
        const url = buildApiUrl(getResolvedBaseUrl(), endpoint);
        const headers: HeadersInit = {
            ...options.headers,
            ...getClientAuthHeaders(),
        };

        if (options.body !== undefined && !('Content-Type' in headers)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        let data: any;
        try {
            ({ data } = await performHttpJsonRequest<any>(url, {
                ...options,
                headers,
                credentials: options.credentials ?? 'include',
            }));
        } catch (error) {
            if (error instanceof HttpResponseError) {
                const errorPayload = (error.payload || {}) as ApiErrorInput;
                throw new ApiError(errorPayload, error.status);
            }
            throw new ApiError({ error: 'Network request failed' }, 500);
        }

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
        enforceEndpointPolicy(endpoint);
        const headers: HeadersInit = {
            ...options.headers,
            ...getClientAuthHeaders(),
        };

        if (options.body !== undefined && !('Content-Type' in headers)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        let data: any;
        try {
            ({ data } = await performHttpJsonRequest<any>(endpoint, {
                ...options,
                headers,
                credentials: 'include',
            }));
        } catch (error) {
            if (error instanceof HttpResponseError) {
                const errorPayload = (error.payload || {}) as ApiErrorInput;
                throw new ApiError(errorPayload, error.status);
            }
            throw new ApiError({ error: 'Network request failed' }, 500);
        }

        if (mutationScope) {
            broadcastMutationInvalidation(mutationScope);
        }
        return data;
    };

    return {
        // Companies
        getCompanies: () => request(ENDPOINTS.COMPANIES.BASE),
        upsertCompany: (data: CompanyUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/companies', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'companies'),
        deleteCompany: (id: string) => requestServerWrite(`/api/write/companies/${id}`, { method: 'DELETE' }, 'companies'),

        // Projects
        getProjects: () => request(ENDPOINTS.PROJECTS.BASE),
        upsertProject: (data: ProjectUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/projects', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'projects'),
        deleteProject: (id: string) => requestServerWrite(`/api/write/projects/${id}`, { method: 'DELETE' }, 'projects'),

        // Project Services
        getProjectServices: () => request('/api/v1/project_services'),
        upsertProjectService: (data: JsonObjectPayload) => request('/api/v1/project_services', { method: 'POST', body: JSON.stringify(data) }),
        deleteProjectService: (id: string) => request(`/api/v1/project_services/${id}`, { method: 'DELETE' }),

        // Trips
        getTrips: () => request(ENDPOINTS.TRIPS.BASE),
        upsertTrip: (data: TripUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/trips', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'trips'),
        deleteTrip: (id: string) => requestServerWrite(`/api/write/trips/${id}`, { method: 'DELETE' }, 'trips'),

        // Users
        getUsers: () => request(ENDPOINTS.SYSTEM.USERS),
        upsertUser: (data: UserUpsertPayload) => request(ENDPOINTS.SYSTEM.USERS, { method: 'POST', body: JSON.stringify(data) }),
        deleteUser: (id: string) => request(`${ENDPOINTS.SYSTEM.USERS}/${id}`, { method: 'DELETE' }),
        login: async (credentials: LoginRequestPayload) => {
            const payload = await request(ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: JSON.stringify(credentials) });
            if (!payload || typeof payload !== 'object') {
                return payload;
            }

            return sanitizeSessionUser(payload as Parameters<typeof sanitizeSessionUser>[0]);
        },
        logout: () => request(ENDPOINTS.AUTH.LOGOUT, { method: 'POST' }),

        // SaaS Config
        getConfig: () => request('/api/v1/config'),
        upsertConfig: (data: ConfigUpsertPayload) => request('/api/v1/config', { method: 'POST', body: JSON.stringify(data) }),

        // Services
        getServices: () => request(ENDPOINTS.SERVICES.BASE),
        upsertService: (data: ServiceUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/services', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'services'),
        deleteService: (id: string) => requestServerWrite(`/api/write/services/${id}`, { method: 'DELETE' }, 'services'),

        // Vehicles
        getVehicles: () => request(ENDPOINTS.FLEET.VEHICLES),
        upsertVehicle: async (data: VehicleUpsertPayload, skipValidation?: boolean) => {
            // [PERF] Document uniqueness is enforced server-side via DB constraints.
            // Client-side validation for empty required fields only.
            const vehicleData = data as VehicleUpsertPayload & { documents?: Array<{ type?: string; expiry_date?: string }> };
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
        upsertDriver: (data: DriverUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/drivers', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'drivers'),
        deleteDriver: (id: string) => requestServerWrite(`/api/write/drivers/${id}`, { method: 'DELETE' }, 'drivers'),

        // Inventory
        getContainers: () => request('/api/v1/inventory/containers'),
        upsertContainer: (data: JsonObjectPayload) => request('/api/v1/inventory/containers', { method: 'POST', body: JSON.stringify(data) }),
        deleteContainer: (id: string) => request(`/api/v1/inventory/containers/${id}`, { method: 'DELETE' }),
        getTanks: () => request('/api/v1/inventory/tanks'),
        upsertTank: (data: JsonObjectPayload) => request('/api/v1/inventory/tanks', { method: 'POST', body: JSON.stringify(data) }),
        deleteTank: (id: string) => request(`/api/v1/inventory/tanks/${id}`, { method: 'DELETE' }),
        getInventorySizes: () => request('/api/v1/inventory/sizes'),
        upsertInventorySize: (data: JsonObjectPayload) => request('/api/v1/inventory/sizes', { method: 'POST', body: JSON.stringify(data) }),
        deleteInventorySize: (id: string) => request(`/api/v1/inventory/sizes/${id}`, { method: 'DELETE' }),

        // Scales
        getScales: () => request('/api/v1/inventory/scales'),
        upsertScale: (data: JsonObjectPayload) => request('/api/v1/inventory/scales', { method: 'POST', body: JSON.stringify(data) }),
        deleteScale: (id: string) => request(`/api/v1/inventory/scales/${id}`, { method: 'DELETE' }),

        // Logs
        getLogs: () => request(ENDPOINTS.SYSTEM.LOGS),
        addLog: (logData: JsonObjectPayload) => request(ENDPOINTS.SYSTEM.LOGS, { method: 'POST', body: JSON.stringify(logData) }),

        // Notifications
        getNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE),
        addNotification: (data: JsonObjectPayload) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'POST', body: JSON.stringify(data) }),
        markNotificationRead: (id: string) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.MARK_READ(id), { method: 'PATCH' }), // Backend forces TRUE currently
        markAllNotificationsRead: () => request(`${ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE}/read-all`, { method: 'PATCH' }),
        deleteAllNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'DELETE' }),
        deleteNotification: (id: string) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BY_ID(id), { method: 'DELETE' }),

        // Permission Requests
        getPermissionRequests: () => request('/api/v1/permission-requests'),
        upsertPermissionRequest: (data: JsonObjectPayload) => request('/api/v1/permission-requests', { method: 'POST', body: JSON.stringify(data) }),
        deletePermissionRequest: (id: string) => request(`/api/v1/permission-requests/${id}`, { method: 'DELETE' }),

        // Contact Submissions
        getContactSubmissions: () => request('/api/v1/contact-submissions'),
        addContactSubmission: (data: JsonObjectPayload) => request('/api/v1/contact-submissions', { method: 'POST', body: JSON.stringify(data) }),
        deleteContactSubmission: (id: string) => request(`/api/v1/contact-submissions/${id}`, { method: 'DELETE' }),

        // Environmental Equipments (E-Commerce)
        getEquipments: () => request('/api/v1/public/store/equipments'),
        getEquipmentDetail: (id: string) => request(`/api/v1/public/store/equipments/${id}`),
        upsertEquipment: (data: JsonObjectPayload) => request('/api/v1/public/store/equipments', { method: 'POST', body: JSON.stringify(data) }),
        deleteEquipment: (id: string) => request(`/api/v1/public/store/equipments/${id}`, { method: 'DELETE' }),
        shareEquipment: (id: string) => request(`/api/v1/public/store/equipments/${id}/share`, { method: 'POST' }),

        // Equipment Inquiries
        getEquipmentInquiries: () => request('/api/v1/public/store/inquiries'),
        submitEquipmentInquiry: (data: JsonObjectPayload) => request('/api/v1/public/store/inquiries', { method: 'POST', body: JSON.stringify(data) }),
        updateEquipmentInquiry: (id: string, data: JsonObjectPayload) => request(`/api/v1/public/store/inquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteEquipmentInquiry: (id: string) => request(`/api/v1/public/store/inquiries/${id}`, { method: 'DELETE' }),

        getSuppliers: () => request('/api/v1/suppliers'),
        upsertSupplier: (data: SupplierUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/suppliers', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'suppliers'),
        deleteSupplier: (id: string) => requestServerWrite(`/api/write/suppliers/${id}`, { method: 'DELETE' }, 'suppliers'),

        // Facilities
        getFacilities: () => request('/api/v1/facilities'),
        upsertFacility: (data: FacilityUpsertPayload, skipValidation?: boolean) => requestServerWrite('/api/write/facilities', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }, 'facilities'),
        deleteFacility: (id: string) => requestServerWrite(`/api/write/facilities/${id}`, { method: 'DELETE' }, 'facilities'),

        // Asset Requests
        getAssetRequests: () => request('/api/v1/asset_requests'),
        upsertAssetRequest: (data: JsonObjectPayload) => request('/api/v1/asset_requests', { method: 'POST', body: JSON.stringify(data) }),

        // Asset Service Links (N:N)
        getAssetServiceLinks: () => request('/api/v1/asset-service-links'),
        syncAssetServiceLinks: (assetType: string, assetId: string, serviceIds: string[]) =>
            request(`/api/v1/asset-service-links/${assetType}/${assetId}`, { method: 'PUT', body: JSON.stringify({ service_ids: serviceIds }) }),

        // AI Sessions
        logAISession: (data: JsonObjectPayload) => request(ENDPOINTS.AI.LOG_SESSION, { method: 'POST', body: JSON.stringify(data) }),
        getAISessions: (params?: Record<string, string>) => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            return request(`${ENDPOINTS.AI.SESSIONS}${qs}`);
        },
        getAISessionById: (id: string) => request(ENDPOINTS.AI.SESSION_BY_ID(id)),
        getAIAnalytics: () => request(ENDPOINTS.AI.ANALYTICS),
        rateAISession: (id: string, data: { rating?: number; flagged?: boolean }) => request(ENDPOINTS.AI.RATE_SESSION(id), { method: 'PATCH', body: JSON.stringify(data) }),
        chatWithAI: (messages: any[], context: any) => request(ENDPOINTS.AI.CHAT, { method: 'POST', body: JSON.stringify({ messages, context }) }),

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

export const _internal = {
    isAllowedApiPath,
    LEGACY_ENDPOINT_ALLOW_PREFIXES,
};
