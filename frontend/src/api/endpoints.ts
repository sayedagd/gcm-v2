
/**
 * ملف واجهات برمجة التطبيقات (API Endpoints)
 * هنا نقوم بتعريف كافة المسارات التي سيستخدمها النظام للتواصل مع السيرفر مستقبلاً.
 * تم تقسيم المسارات حسب الموديول (Module-based) لسهولة الصيانة.
 */

export const ENDPOINTS = {
  // موديول الحسابات والأمان
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },

  // موديول الشركات (Clients)
  COMPANIES: {
    BASE: '/api/companies',
    BY_ID: (id: string) => `/api/companies/${id}`,
  },

  // موديول المشاريع (Sites)
  PROJECTS: {
    BASE: '/api/projects',
    BY_ID: (id: string) => `/api/projects/${id}`,
  },

  // موديول الخدمات
  SERVICES: {
    BASE: '/api/services',
  },

  // موديول العمليات الميدانية (Operations)
  TRIPS: {
    BASE: '/api/trips',
    BY_ID: (id: string) => `/api/trips/${id}`,
  },

  // موديول اللوجستيات (Logistics)
  FLEET: {
    VEHICLES: '/api/vehicles',
    DRIVERS: '/api/drivers',
  },

  // موديول النظام والإدارة
  SYSTEM: {
    USERS: '/api/users',
    LOGS: '/api/logs',
    NOTIFICATIONS: {
      BASE: '/api/notifications',
      BY_ID: (id: string) => `/api/notifications/${id}`,
      MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    },
    BACKUP: '/api/system/backup/download',
    SCHEMA_HEALTH: '/api/system/schema-health',
    FORCE_MIGRATE: '/api/system/force-migrate',
  },

  // موديول الذكاء الاصطناعي
  AI: {
    LOG_SESSION: '/api/ai/log-session',
    SESSIONS: '/api/ai/sessions',
    SESSION_BY_ID: (id: string) => `/api/ai/sessions/${id}`,
    ANALYTICS: '/api/ai/analytics',
    RATE_SESSION: (id: string) => `/api/ai/sessions/${id}/rate`,
    CHAT: '/api/ai/chat',
  }
};

/**
 * دالة مساعدة لبناء رابط الـ API الكامل
 * تأخذ مسار الـ Endpoint وتدمجه مع الـ Base URL المظبوط في الإعدادات
 */
export const buildApiUrl = (baseUrl: string, endpoint: string) => {
  return `${baseUrl.replace(/\/$/, '')}${endpoint}`;
};
