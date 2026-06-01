
import { ENDPOINTS, buildApiUrl } from './endpoints';

/**
 * [AR] خطأ API مخصص — يحمل رسائل ثنائية اللغة من السيرفر
 * [EN] Custom API Error — carries bilingual messages from the server
 */
export class ApiError extends Error {
    messageAr: string;
    messageEn: string;
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
        this.field = data.field;
        this.code = data.code;
        this.allErrors = data.allErrors;
    }
}

/**
 * [AR] خدمة الاتصال بالسيرفر (API Client)
 * [EN] API Client Service for Backend Communication
 */
export const createApiClient = (baseUrl: string = '') => {
    const request = async (endpoint: string, options: RequestInit = {}) => {
        const url = buildApiUrl(baseUrl || '', endpoint);
        const isAuth = localStorage.getItem('gcm_auth_session') === 'true';
        const token = isAuth ? localStorage.getItem('gcm_jwt_token') || '' : '';

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                'x-gcm-auth': token ? 'VALID' : '',
                ...options.headers,
            },
        });

        if (!response.ok) {
            // [AR] قراءة جسم الرد للحصول على الأخطاء ثنائية اللغة
            let errorData: any = {};
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: response.statusText };
            }
            throw new ApiError(errorData, response.status);
        }

        return response.json();
    };

    return {
        // Companies
        getCompanies: () => request(ENDPOINTS.COMPANIES.BASE),
        upsertCompany: (data: any, skipValidation?: boolean) => request(ENDPOINTS.COMPANIES.BASE, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteCompany: (id: string) => request(ENDPOINTS.COMPANIES.BY_ID(id), { method: 'DELETE' }),

        // Projects
        getProjects: () => request(ENDPOINTS.PROJECTS.BASE),
        upsertProject: (data: any, skipValidation?: boolean) => request(ENDPOINTS.PROJECTS.BASE, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteProject: (id: string) => request(ENDPOINTS.PROJECTS.BY_ID(id), { method: 'DELETE' }),

        // Project Services
        getProjectServices: () => request('/api/project_services'),
        upsertProjectService: (data: any) => request('/api/project_services', { method: 'POST', body: JSON.stringify(data) }),
        deleteProjectService: (id: string) => request(`/api/project_services/${id}`, { method: 'DELETE' }),

        // Trips
        getTrips: () => request(ENDPOINTS.TRIPS.BASE),
        upsertTrip: (data: any, skipValidation?: boolean) => request(ENDPOINTS.TRIPS.BASE, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteTrip: (id: string) => request(ENDPOINTS.TRIPS.BY_ID(id), { method: 'DELETE' }),

        // Users
        getUsers: () => request(ENDPOINTS.SYSTEM.USERS),
        upsertUser: (data: any) => request(ENDPOINTS.SYSTEM.USERS, { method: 'POST', body: JSON.stringify(data) }),
        deleteUser: (id: string) => request(`${ENDPOINTS.SYSTEM.USERS}/${id}`, { method: 'DELETE' }),
        login: (credentials: any) => request(ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: JSON.stringify(credentials) }),

        // SaaS Config
        getConfig: () => request('/api/config'),
        upsertConfig: (data: any) => request('/api/config', { method: 'POST', body: JSON.stringify(data) }),

        // Services
        getServices: () => request(ENDPOINTS.SERVICES.BASE),
        upsertService: (data: any, skipValidation?: boolean) => request(ENDPOINTS.SERVICES.BASE, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteService: (id: string) => request(`${ENDPOINTS.SERVICES.BASE}/:id`.replace(':id', id), { method: 'DELETE' }),

        // Vehicles
        getVehicles: () => request(ENDPOINTS.FLEET.VEHICLES),
        upsertVehicle: async (data: any, skipValidation?: boolean) => {
            // [PERF] Document uniqueness is enforced server-side via DB constraints.
            // Client-side validation for empty required fields only.
            if (!skipValidation && data.documents && Array.isArray(data.documents)) {
                const typesInPayload = new Set<string>();
                for (const doc of data.documents) {
                    if (typesInPayload.has(doc.type)) {
                        throw new Error(`Error: المستند موجود بالفعل للسيارة دي [${doc.type}]`);
                    }
                    typesInPayload.add(doc.type);
                    if (!doc.expiry_date) {
                        throw new Error(`Error: تاريخ الانتهاء مطلوب للمستند [${doc.type}]`);
                    }
                }
            }
            return request(ENDPOINTS.FLEET.VEHICLES, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} });
        },
        deleteVehicle: (id: string) => request(`${ENDPOINTS.FLEET.VEHICLES}/:id`.replace(':id', id), { method: 'DELETE' }),

        // Drivers
        getDrivers: () => request(ENDPOINTS.FLEET.DRIVERS),
        upsertDriver: (data: any, skipValidation?: boolean) => request(ENDPOINTS.FLEET.DRIVERS, { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteDriver: (id: string) => request(`${ENDPOINTS.FLEET.DRIVERS}/:id`.replace(':id', id), { method: 'DELETE' }),

        // Inventory
        getContainers: () => request('/api/inventory/containers'),
        upsertContainer: (data: any) => request('/api/inventory/containers', { method: 'POST', body: JSON.stringify(data) }),
        deleteContainer: (id: string) => request(`/api/inventory/containers/${id}`, { method: 'DELETE' }),
        getTanks: () => request('/api/inventory/tanks'),
        upsertTank: (data: any) => request('/api/inventory/tanks', { method: 'POST', body: JSON.stringify(data) }),
        deleteTank: (id: string) => request(`/api/inventory/tanks/${id}`, { method: 'DELETE' }),
        getInventorySizes: () => request('/api/inventory/sizes'),
        upsertInventorySize: (data: any) => request('/api/inventory/sizes', { method: 'POST', body: JSON.stringify(data) }),
        deleteInventorySize: (id: string) => request(`/api/inventory/sizes/${id}`, { method: 'DELETE' }),

        // Scales
        getScales: () => request('/api/inventory/scales'),
        upsertScale: (data: any) => request('/api/inventory/scales', { method: 'POST', body: JSON.stringify(data) }),
        deleteScale: (id: string) => request(`/api/inventory/scales/${id}`, { method: 'DELETE' }),

        // Logs
        getLogs: () => request(ENDPOINTS.SYSTEM.LOGS),
        addLog: (logData: any) => request(ENDPOINTS.SYSTEM.LOGS, { method: 'POST', body: JSON.stringify(logData) }),

        // Notifications
        getNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE),
        addNotification: (data: any) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'POST', body: JSON.stringify(data) }),
        markNotificationRead: (id: string, isRead: boolean = true) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.MARK_READ(id), { method: 'PATCH' }), // Backend forces TRUE currently
        markAllNotificationsRead: () => request(`${ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE}/read-all`, { method: 'PATCH' }),
        deleteAllNotifications: () => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BASE, { method: 'DELETE' }),
        deleteNotification: (id: string) => request(ENDPOINTS.SYSTEM.NOTIFICATIONS.BY_ID(id), { method: 'DELETE' }),

        // Permission Requests
        getPermissionRequests: () => request('/api/permission-requests'),
        upsertPermissionRequest: (data: any) => request('/api/permission-requests', { method: 'POST', body: JSON.stringify(data) }),

        // Contact Submissions
        getContactSubmissions: () => request('/api/contact-submissions'),
        addContactSubmission: (data: any) => request('/api/contact-submissions', { method: 'POST', body: JSON.stringify(data) }),
        deleteContactSubmission: (id: string) => request(`/api/contact-submissions/${id}`, { method: 'DELETE' }),

        // Environmental Equipments (E-Commerce)
        getEquipments: () => request('/api/public/store/equipments'),
        getEquipmentDetail: (id: string) => request(`/api/public/store/equipments/${id}`),
        upsertEquipment: (data: any) => request('/api/public/store/equipments', { method: 'POST', body: JSON.stringify(data) }),
        deleteEquipment: (id: string) => request(`/api/public/store/equipments/${id}`, { method: 'DELETE' }),
        shareEquipment: (id: string) => request(`/api/public/store/equipments/${id}/share`, { method: 'POST' }),

        // Equipment Inquiries
        getEquipmentInquiries: () => request('/api/public/store/inquiries'),
        submitEquipmentInquiry: (data: any) => request('/api/public/store/inquiries', { method: 'POST', body: JSON.stringify(data) }),
        updateEquipmentInquiry: (id: string, data: any) => request(`/api/public/store/inquiries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteEquipmentInquiry: (id: string) => request(`/api/public/store/inquiries/${id}`, { method: 'DELETE' }),

        getSuppliers: () => request('/api/suppliers'),
        upsertSupplier: (data: any, skipValidation?: boolean) => request('/api/suppliers', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteSupplier: (id: string) => request(`/api/suppliers/${id}`, { method: 'DELETE' }),

        // Facilities
        getFacilities: () => request('/api/facilities'),
        upsertFacility: (data: any, skipValidation?: boolean) => request('/api/facilities', { method: 'POST', body: JSON.stringify(data), headers: skipValidation ? { 'x-skip-validation': 'true' } : {} }),
        deleteFacility: (id: string) => request(`/api/facilities/${id}`, { method: 'DELETE' }),

        // AI Sessions
        logAISession: (data: any) => request(ENDPOINTS.AI.LOG_SESSION, { method: 'POST', body: JSON.stringify(data) }),
        getAISessions: (params?: Record<string, string>) => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            return request(`${ENDPOINTS.AI.SESSIONS}${qs}`);
        },
        getAISessionById: (id: string) => request(ENDPOINTS.AI.SESSION_BY_ID(id)),
        getAIAnalytics: () => request(ENDPOINTS.AI.ANALYTICS),
        rateAISession: (id: string, data: { rating?: number; flagged?: boolean }) => request(ENDPOINTS.AI.RATE_SESSION(id), { method: 'PATCH', body: JSON.stringify(data) }),
        chatWithAI: (messages: any[], context: any) => request(ENDPOINTS.AI.CHAT, { method: 'POST', body: JSON.stringify({ messages, context }) }),

        // Asset Requests
        getAssetRequests: () => request('/api/asset_requests'),
        upsertAssetRequest: (data: any) => request('/api/asset_requests', { method: 'POST', body: JSON.stringify(data) }),

        // Asset Service Links (N:N)
        getAssetServiceLinks: () => request('/api/asset-service-links'),
        syncAssetServiceLinks: (assetType: string, assetId: string, serviceIds: string[]) =>
            request(`/api/asset-service-links/${assetType}/${assetId}`, { method: 'PUT', body: JSON.stringify({ service_ids: serviceIds }) }),

        // AI OCR
        processOcrVision: (base64: string) => request('/api/ai/ocr/vision', { method: 'POST', body: JSON.stringify({ image: base64 }) }),

        // System
        getWhatsappStatus: () => request('/api/system/whatsapp/qr'),
        getBackupStatus: () => request('/api/backup/status'),
        restoreBackup: (file: File) => {
            const formData = new FormData();
            formData.append('backup_file', file);
            
            const url = buildApiUrl(baseUrl || '', '/api/backup/restore');
            const isAuth = localStorage.getItem('gcm_auth_session') === 'true';
            const token = isAuth ? localStorage.getItem('gcm_jwt_token') || '' : '';
            
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: formData
            }).then(res => res.json().then(data => res.ok ? data : Promise.reject(data)));
        },
    };
};
