
/**
 * ملف واجهات برمجة التطبيقات (API Endpoints)
 * هنا نقوم بتعريف كافة المسارات التي سيستخدمها النظام للتواصل مع السيرفر مستقبلاً.
 * تم تقسيم المسارات حسب الموديول (Module-based) لسهولة الصيانة.
 */

export const ENDPOINTS = {
  // موديول الحسابات والأمان
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
  },

  // موديول الشركات (Clients)
  COMPANIES: {
    BASE: '/api/v1/companies',
    BY_ID: (id: string) => `/api/v1/companies/${id}`,
  },

  // موديول المشاريع (Sites)
  PROJECTS: {
    BASE: '/api/v1/projects',
    BY_ID: (id: string) => `/api/v1/projects/${id}`,
  },

  // موديول الخدمات
  SERVICES: {
    BASE: '/api/v1/services',
  },

  // موديول العمليات الميدانية (Operations)
  TRIPS: {
    BASE: '/api/v1/trips',
    BY_ID: (id: string) => `/api/v1/trips/${id}`,
  },

  // موديول اللوجستيات (Logistics)
  FLEET: {
    VEHICLES: '/api/v1/vehicles',
    DRIVERS: '/api/v1/drivers',
  },

  // موديول النظام والإدارة
  SYSTEM: {
    USERS: '/api/v1/users',
    LOGS: '/api/v1/logs',
    NOTIFICATIONS: {
      BASE: '/api/v1/notifications',
      BY_ID: (id: string) => `/api/v1/notifications/${id}`,
      MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
    },
    BACKUP: '/api/v1/system/backup/download',
    SCHEMA_HEALTH: '/api/v1/system/schema-health',
    FORCE_MIGRATE: '/api/v1/system/force-migrate',
  },

  // موديول الذكاء الاصطناعي
  AI: {
    LOG_SESSION: '/api/v1/ai/log-session',
    SESSIONS: '/api/v1/ai/sessions',
    SESSION_BY_ID: (id: string) => `/api/v1/ai/sessions/${id}`,
    ANALYTICS: '/api/v1/ai/analytics',
    RATE_SESSION: (id: string) => `/api/v1/ai/sessions/${id}/rate`,
    CHAT: '/api/v1/ai/chat',
  }
};

/**
 * دالة مساعدة لبناء رابط الـ API الكامل
 * تأخذ مسار الـ Endpoint وتدمجه مع الـ Base URL المظبوط في الإعدادات
 */
export const buildApiUrl = (baseUrl: string, endpoint: string) => {
  return `${baseUrl.replace(/\/$/, '')}${endpoint}`;
};
