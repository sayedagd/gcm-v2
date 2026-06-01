export const API_LEGACY_PREFIX = "/api";
export const API_V1_PREFIX = "/api/v1";

export const API_ENDPOINTS = {
  auth: {
    login: `${API_V1_PREFIX}/auth/login`,
    logout: `${API_V1_PREFIX}/auth/logout`,
    sseToken: `${API_V1_PREFIX}/auth/sse-token`,
  },
  system: {
    config: `${API_V1_PREFIX}/config`,
    backupStatus: `${API_V1_PREFIX}/system/backup/status`,
    backupDownload: `${API_V1_PREFIX}/system/backup/download`,
    backupRestore: `${API_V1_PREFIX}/system/backup/restore`,
  },
} as const;
