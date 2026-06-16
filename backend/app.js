/**
 * GCM ERP - Production Entry Point
 *
 * IMPORTANT FOR DEPLOYMENT:
 * - This file runs as the backend entry in local Node and Vercel serverless wrapper modes
 * - Keep environment variables in backend/.env locally and in Vercel project settings in production
 * - This file is designed to be crash-resistant: if any module fails to load,
 *   the server still starts and returns helpful error messages
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const http = require('http');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./src/shared/config/auth');
const { validateRuntimeConfig } = require('./src/shared/config/runtimeConfig');

// Environment Setup (load backend/.env locally only; Vercel should use platform envs)
const findEnv = () => {
    if (process.env.VERCEL === '1') return null;

    const paths = [path.join(__dirname, '.env')];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
};
dotenv.config({ path: findEnv() });

// Sanitize process.env values by trimming and removing trailing carriage returns (\r) or surrounding quotes
for (const key of Object.keys(process.env)) {
    let val = process.env[key];
    if (typeof val === 'string') {
        val = val.trim().replace(/\r+$/, '');
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        process.env[key] = val;
    }
}

validateRuntimeConfig();

// [Vercel NFT Dependency Tracer Guard]
// Force Vercel's static analyzer to trace and bundle all dynamically loaded modules and routes.
if (false) {
    require('./database');
    require('./fileService');
    require('./src/shared/utils/logger');
    require('./src/shared/services/migrationService');
    require('./src/shared/services/backupService');
    require('./src/shared/middleware/errorMiddleware');
    require('./src/shared/middleware/requestContextMiddleware');
    require('./src/shared/controllers/systemController');
    require('./src/shared/middleware/authMiddleware');
    require('./src/shared/middleware/requestValidationMiddleware');
    require('./src/shared/services/uploadStorageService');
    require('./src/shared/middleware/rateLimitPolicies');
    require('./src/shared/services/whatsappService');

    // Route Modules
    require('./src/modules/auth/login/login.routes');
    require('./src/modules/auth/profile/profile.routes');
    require('./src/modules/auth/users/users.routes');
    require('./src/modules/core/companies/companies.routes');
    require('./src/modules/core/projects/projects.routes');
    require('./src/modules/core/services/services.routes');
    require('./src/modules/core/facilities/facilities.routes');
    require('./src/modules/operations/trips/trips.routes');
    require('./src/modules/operations/requests/requests.routes');
    require('./src/modules/operations/notifications/notifications.routes');
    require('./src/modules/operations/asset_requests/asset_requests.routes');
    require('./src/modules/logistics/vehicles/vehicles.routes');
    require('./src/modules/logistics/drivers/drivers.routes');
    require('./src/modules/logistics/inventory/inventory.routes');
    require('./src/modules/reporting/dashboard/dashboard.routes');
    require('./src/modules/reporting/exports/exports.routes');
    require('./src/modules/public/landing/landing.routes');
    require('./src/modules/public/contact/contact.routes');
    require('./src/modules/public/store/store.routes');
    require('./src/modules/public/carbon/carbon.routes');
    require('./src/modules/infrastructure/health/health.routes');
    require('./src/modules/infrastructure/backup/backup.routes');
    require('./src/modules/infrastructure/settings/settings.routes');
    require('./src/modules/logistics/suppliers/suppliers.routes');
    require('./src/modules/core/project_services/project_services.routes');
    require('./src/modules/core/supplier_rates/supplier_rates.routes');
    require('./src/modules/logistics/asset_service_links/assetServiceLinks.routes');
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vercel, Cloudflare, Passenger, etc.)
const port = process.env.PORT || 8080;
const processRole = process.env.PROCESS_ROLE || 'api';
const enableInProcessJobsRequested = process.env.ENABLE_IN_PROCESS_JOBS === 'true';
const shouldRunInProcessJobs = processRole === 'worker';
const runtimeWritableRoot = process.env.VERCEL ? '/tmp' : __dirname;
const UPLOADS_DIR = path.join(runtimeWritableRoot, 'uploads');
const API_V1_PREFIX = '/api/v1';
const STARTUP_MODULE_POLICY = Object.freeze({
    critical: new Set([
        'logger',
        'database',
        'migrationService',
        'errorMiddleware',
        'requestContextMiddleware',
        'systemController',
        'authMiddleware',
        'requestValidationMiddleware',
        'rateLimitPolicies',
        'login',
        'profile',
        'users',
        'companies',
        'projects',
        'services',
        'trips',
        'health',
        'backup',
        'settings',
    ]),
    optional: new Set([
        'backupService',
        'upload-storage',
        'whatsappService',
        'facilities',
        'requests',
        'notifications',
        'asset_requests',
        'vehicles',
        'drivers',
        'inventory',
        'dashboard',
        'exports',
        'landing',
        'contact',
        'store',
        'carbon',
        'suppliers',
        'project_services',
        'supplier_rates',
        'asset_service_links',
    ]),
});

const ensureDirExists = (dirPath, label) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (err) {
        console.warn(`[GCM] Could not initialize ${label} directory at ${dirPath}: ${err.message}`);
        return false;
    }
};

// Ensure upload directory exists
ensureDirExists(UPLOADS_DIR, 'uploads');

// --- Safe require helper: prevents crash if a module is missing ---
function safeRequire(modulePath, name) {
    try {
        return require(modulePath);
    } catch (err) {
        console.error(`[GCM] Failed to load module "${name}": ${err.message}`, err.stack);
        // Return a dummy router so the app doesn't crash
        const router = express.Router();
        router.all('*', (req, res) => {
            res.status(503).json({ error: `Module "${name}" failed to load`, detail: err.message });
        });
        return router;
    }
}

function requireCritical(modulePath, name) {
    try {
        return require(modulePath);
    } catch (err) {
        const message = `[GCM] Critical module "${name}" failed to load: ${err.message}`;
        console.error(message, err.stack);
        const startupError = new Error(message);
        startupError.cause = err;
        throw startupError;
    }
}

function requireByStartupPolicy(modulePath, name) {
    if (STARTUP_MODULE_POLICY.critical.has(name)) {
        return requireCritical(modulePath, name);
    }

    if (!STARTUP_MODULE_POLICY.optional.has(name)) {
        console.warn(`[GCM] Module "${name}" is not declared in startup policy. Defaulting to optional-safe load.`);
    }

    return safeRequire(modulePath, name);
}

function safeLazyRouter(modulePath, name) {
    let loadedRouter = null;
    const proxy = express.Router();

    proxy.use((req, res, next) => {
        if (!loadedRouter) {
            loadedRouter = safeRequire(modulePath, name);
        }
        return loadedRouter(req, res, next);
    });

    return proxy;
}

// --- Core middleware (these MUST work or the app is broken) ---
try {
    require('express-async-errors');
} catch (e) {
    console.error('[GCM] express-async-errors not found, continuing without it');
}

let helmet, rateLimit;
try { helmet = require('helmet'); } catch (e) { console.error('[GCM] helmet not found'); }
try { rateLimit = require('express-rate-limit'); } catch (e) { console.error('[GCM] express-rate-limit not found'); }

// --- Load internal shared modules safely ---
const logModule = requireByStartupPolicy('./src/shared/utils/logger', 'logger');
const log = logModule.log || console.log;

const dbModule = requireByStartupPolicy('./database', 'database');
const query = dbModule.query || (() => Promise.reject(new Error('DB not loaded')));
const waitForDb = dbModule.waitForDb || (() => Promise.resolve());

const migrationModule = requireByStartupPolicy('./src/shared/services/migrationService', 'migrationService');
const runStartupMigrations = migrationModule.runStartupMigrations || (() => Promise.resolve());
const getSchemaHealthReport = migrationModule.getSchemaHealthReport || (() => Promise.resolve({ status: 'UNAVAILABLE' }));

const backupModule = requireByStartupPolicy('./src/shared/services/backupService', 'backupService');
const initBackupScheduler = backupModule.initBackupScheduler || (() => {});
const BACKUPS_DIR = backupModule.BACKUPS_DIR || path.join(__dirname, 'backups');



const errorMiddleware = requireByStartupPolicy('./src/shared/middleware/errorMiddleware', 'errorMiddleware');
const errorHandler = errorMiddleware.errorHandler || ((err, req, res, next) => res.status(500).json({ error: err.message }));
const notFound = errorMiddleware.notFound || ((req, res) => res.status(404).json({ error: 'Not Found' }));

const requestContextMiddleware = requireByStartupPolicy('./src/shared/middleware/requestContextMiddleware', 'requestContextMiddleware');
const requestContext = requestContextMiddleware.requestContext || ((req, res, next) => next());

const { sseHandler } = require('./src/shared/services/eventBus');
const systemController = requireByStartupPolicy('./src/shared/controllers/systemController', 'systemController');

const authMiddleware = requireByStartupPolicy('./src/shared/middleware/authMiddleware', 'authMiddleware');
const protect = authMiddleware.protect || ((req, res, next) => next());
const authorizeRoles = authMiddleware.authorizeRoles || (() => (req, res, next) => next());

const requestValidationMiddleware = requireByStartupPolicy('./src/shared/middleware/requestValidationMiddleware', 'requestValidationMiddleware');
const validateAndSanitizeWritePayload =
    requestValidationMiddleware.validateAndSanitizeWritePayload || ((req, res, next) => next());

const uploadStorageModule = requireByStartupPolicy('./src/shared/services/uploadStorageService', 'upload-storage');
const isUploadsObjectStorageEnabled = uploadStorageModule.isUploadsObjectStorageEnabled || (() => false);
const getSignedUploadReadUrl = uploadStorageModule.getSignedUploadReadUrl || (async () => null);

const rateLimitPoliciesModule = requireByStartupPolicy('./src/shared/middleware/rateLimitPolicies', 'rateLimitPolicies');
const buildRateLimitPolicies = rateLimitPoliciesModule.buildRateLimitPolicies || (() => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next(),
    publicWriteLimiter: (req, res, next) => next(),
    sseTokenLimiter: (req, res, next) => next(),
    adminOpsLimiter: (req, res, next) => next(),
}));

const whatsappModule = requireByStartupPolicy('./src/shared/services/whatsappService', 'whatsappService');
const initWhatsApp = whatsappModule.initWhatsApp || (() => {});
const getQrCode = whatsappModule.getQrCode || (() => ({ isReady: false, qrCode: null }));

// Ensure backup directory
ensureDirExists(BACKUPS_DIR, 'backups');

let startupServicesPromise = null;

const initializeStartupServices = ({ runHeavyServices = false } = {}) => {
    if (startupServicesPromise) {
        return startupServicesPromise;
    }

    startupServicesPromise = (async () => {
        if (enableInProcessJobsRequested && processRole !== 'worker') {
            log(`[GCM] Ignoring ENABLE_IN_PROCESS_JOBS=true for ${processRole} role. Background jobs run in worker role only.`);
        }

        if (runHeavyServices) {
            // Heavy integrations are enabled in long-lived runtime mode only.
            if (shouldRunInProcessJobs && process.env.ENABLE_WHATSAPP === 'true') {
                log(`[GCM] Initializing WhatsApp integration in ${processRole} role.`);
                initWhatsApp();
            } else if (!shouldRunInProcessJobs) {
                log(`[GCM] Skipping WhatsApp in-process startup for ${processRole} role.`);
            } else {
                log('[GCM] WhatsApp service disabled. Set ENABLE_WHATSAPP=true to enable.');
            }
        }

        await waitForDb();
        if (process.env.ENABLE_STARTUP_MIGRATIONS === 'true') {
            await runStartupMigrations();
        } else {
            log('[SMART-MIGRATION] Startup migrations skipped. Set ENABLE_STARTUP_MIGRATIONS=true or call /api/system/force-migrate when you need a schema sync.');
        }
        if (shouldRunInProcessJobs) {
            initBackupScheduler();
        } else {
            log(`[GCM] Skipping in-process backup scheduler for ${processRole} role.`);
        }
        log('[GCM] Startup services initialized successfully');
    })();

    return startupServicesPromise;
};

// --- Rate Limiting ---
const {
    globalLimiter,
    authLimiter,
    publicWriteLimiter,
    sseTokenLimiter,
    adminOpsLimiter,
} = buildRateLimitPolicies(rateLimit);

// --- Import Route Modules (all safe-loaded) ---
const loginRoutes = requireByStartupPolicy('./src/modules/auth/login/login.routes', 'login');
const profileRoutes = requireByStartupPolicy('./src/modules/auth/profile/profile.routes', 'profile');
const usersRoutes = requireByStartupPolicy('./src/modules/auth/users/users.routes', 'users');
const companiesRoutes = requireByStartupPolicy('./src/modules/core/companies/companies.routes', 'companies');
const projectsRoutes = requireByStartupPolicy('./src/modules/core/projects/projects.routes', 'projects');
const servicesRoutes = requireByStartupPolicy('./src/modules/core/services/services.routes', 'services');
const facilitiesRoutes = requireByStartupPolicy('./src/modules/core/facilities/facilities.routes', 'facilities');
const tripsRoutes = requireByStartupPolicy('./src/modules/operations/trips/trips.routes', 'trips');
const requestsRoutes = requireByStartupPolicy('./src/modules/operations/requests/requests.routes', 'requests');
const notificationsRoutes = requireByStartupPolicy('./src/modules/operations/notifications/notifications.routes', 'notifications');
const assetRequestsRoutes = requireByStartupPolicy('./src/modules/operations/asset_requests/asset_requests.routes', 'asset_requests');
const vehiclesRoutes = requireByStartupPolicy('./src/modules/logistics/vehicles/vehicles.routes', 'vehicles');
const driversRoutes = requireByStartupPolicy('./src/modules/logistics/drivers/drivers.routes', 'drivers');
const inventoryRoutes = requireByStartupPolicy('./src/modules/logistics/inventory/inventory.routes', 'inventory');
const dashboardRoutes = requireByStartupPolicy('./src/modules/reporting/dashboard/dashboard.routes', 'dashboard');
const exportsRoutes = requireByStartupPolicy('./src/modules/reporting/exports/exports.routes', 'exports');
const landingRoutes = requireByStartupPolicy('./src/modules/public/landing/landing.routes', 'landing');
const contactRoutes = requireByStartupPolicy('./src/modules/public/contact/contact.routes', 'contact');
const storeRoutes = requireByStartupPolicy('./src/modules/public/store/store.routes', 'store');
const carbonRoutes = requireByStartupPolicy('./src/modules/public/carbon/carbon.routes', 'carbon');
const healthRoutes = requireByStartupPolicy('./src/modules/infrastructure/health/health.routes', 'health');
const backupRoutes = requireByStartupPolicy('./src/modules/infrastructure/backup/backup.routes', 'backup');
const settingsRoutes = requireByStartupPolicy('./src/modules/infrastructure/settings/settings.routes', 'settings');
const suppliersRoutes = requireByStartupPolicy('./src/modules/logistics/suppliers/suppliers.routes', 'suppliers');
const projectServicesRoutes = requireByStartupPolicy('./src/modules/core/project_services/project_services.routes', 'project_services');
const supplierRatesRoutes = requireByStartupPolicy('./src/modules/core/supplier_rates/supplier_rates.routes', 'supplier_rates');
const assetServiceLinksRoutes = requireByStartupPolicy('./src/modules/logistics/asset_service_links/assetServiceLinks.routes', 'asset_service_links');

// --- Global Middleware ---
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-inline'"],
                "connect-src": ["'self'", "https://api.climatiq.io", "*.gcm-gulf.com"],
                "img-src": ["'self'", "data:", "https:", "*.unsplash.com"],
            },
        },
    }));
}
const allowedOrigins = [
    process.env.CORS_ORIGIN || null,
    process.env.FRONTEND_URL || null,
    process.env.NEXT_PUBLIC_APP_URL || null,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null,
    process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3000' : null,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
    process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:5173' : null,
].filter(Boolean);

const extraAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOriginSet = new Set([...allowedOrigins, ...extraAllowedOrigins]);

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients and same-origin server calls.
        if (!origin) return callback(null, true);

        if (allowedOriginSet.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(requestContext);
app.use(globalLimiter);

const defaultJsonBodyLimit = process.env.BODY_LIMIT_DEFAULT_JSON || '2mb';
const defaultUrlEncodedBodyLimit = process.env.BODY_LIMIT_DEFAULT_URLENCODED || '2mb';
const uploadJsonBodyLimit = process.env.BODY_LIMIT_UPLOAD_JSON || '25mb';
const uploadUrlEncodedBodyLimit = process.env.BODY_LIMIT_UPLOAD_URLENCODED || '10mb';

const uploadHeavyPrefixes = [
    '/api/trips',
    '/api/asset_requests',
    '/api/requests',
    '/trips',
    '/asset_requests',
    '/requests',
];

const isUploadHeavyPath = (pathName = '') => uploadHeavyPrefixes.some(prefix => pathName.startsWith(prefix));

const defaultJsonParser = express.json({ limit: defaultJsonBodyLimit });
const uploadJsonParser = express.json({ limit: uploadJsonBodyLimit });
const defaultUrlEncodedParser = express.urlencoded({ limit: defaultUrlEncodedBodyLimit, extended: true });
const uploadUrlEncodedParser = express.urlencoded({ limit: uploadUrlEncodedBodyLimit, extended: true });

app.use((req, res, next) => {
    const parser = isUploadHeavyPath(req.path || '') ? uploadJsonParser : defaultJsonParser;
    return parser(req, res, next);
});

app.use((req, res, next) => {
    const parser = isUploadHeavyPath(req.path || '') ? uploadUrlEncodedParser : defaultUrlEncodedParser;
    return parser(req, res, next);
});

app.use(validateAndSanitizeWritePayload);

const uploadAccessMiddleware = async (req, res, next) => {
    if (!isUploadsObjectStorageEnabled()) {
        return next();
    }

    try {
        const key = decodeURIComponent((req.path || '').replace(/^\/+/, ''));
        if (!key) {
            return res.status(404).json({ error: 'Upload key not found' });
        }

        const signedUrl = await getSignedUploadReadUrl({ key, expiresInSeconds: 300 });
        if (!signedUrl) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        return res.redirect(signedUrl);
    } catch (e) {
        return res.status(404).json({ error: 'Upload not found', details: e.message });
    }
};

app.use('/uploads', uploadAccessMiddleware, express.static(UPLOADS_DIR));

const legacyApiSunset = process.env.LEGACY_API_SUNSET || '2026-12-31';
const legacyApiSunsetDate = new Date(`${legacyApiSunset}T00:00:00Z`);
const legacyApiEnforceAfterSunset = process.env.LEGACY_API_ENFORCE_AFTER_SUNSET === 'true';
const legacyDeprecationDocUrl = process.env.LEGACY_API_DEPRECATION_DOC_URL || 'https://github.com/sayedagd/gcm-v2/blob/main/backend/docs/api-v1-deprecation.md';

app.use((req, res, next) => {
    const isLegacyApiPath = req.path.startsWith('/api/') && !req.path.startsWith(`${API_V1_PREFIX}/`);
    if (isLegacyApiPath) {
        res.setHeader('Deprecation', 'true');
        if (!Number.isNaN(legacyApiSunsetDate.getTime())) {
            res.setHeader('Sunset', legacyApiSunsetDate.toUTCString());
        }
        res.setHeader(
            'Link',
            `</api/v1>; rel="successor-version", <${legacyDeprecationDocUrl}>; rel="deprecation"`
        );

        if (
            legacyApiEnforceAfterSunset &&
            !Number.isNaN(legacyApiSunsetDate.getTime()) &&
            Date.now() >= legacyApiSunsetDate.getTime()
        ) {
            return res.status(410).json({
                error: 'Legacy API routes are no longer available',
                code: 'LEGACY_API_SUNSET_ENFORCED',
                successor: '/api/v1',
                sunset: legacyApiSunsetDate.toISOString(),
                deprecationDoc: legacyDeprecationDocUrl,
            });
        }
    }
    next();
});

const toV1Path = (routePath) => {
    if (routePath === '/api') return API_V1_PREFIX;
    if (routePath.startsWith('/api/')) return `${API_V1_PREFIX}/${routePath.slice('/api/'.length)}`;
    return null;
};

const toServerlessPath = (routePath) => {
    // In Vercel function routing, /api/* is stripped before Express handles req.path.
    if (routePath === '/api') return '/';
    if (routePath.startsWith('/api/')) return `/${routePath.slice('/api/'.length)}`;
    return null;
};

const getMountPaths = (routePath) => {
    const paths = [routePath];
    const v1Path = toV1Path(routePath);
    const strippedPath = toServerlessPath(routePath);
    const strippedV1Path = v1Path ? toServerlessPath(v1Path) : null;

    if (v1Path) paths.push(v1Path);
    if (strippedPath && !paths.includes(strippedPath)) paths.push(strippedPath);
    if (strippedV1Path && !paths.includes(strippedV1Path)) paths.push(strippedV1Path);

    return paths;
};

const mountApiUse = (routePath, ...handlers) => {
    const mountPaths = getMountPaths(routePath);
    mountPaths.forEach((mountPath) => app.use(mountPath, ...handlers));
};

const mountApiGet = (routePath, ...handlers) => {
    const mountPaths = getMountPaths(routePath);
    mountPaths.forEach((mountPath) => app.get(mountPath, ...handlers));
};

mountApiUse('/api/uploads', uploadAccessMiddleware, express.static(UPLOADS_DIR));

// --- Diagnostic Route (ALWAYS first, helps verify Node.js is executing) ---
mountApiGet('/api/diag', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString()
    });
});

// --- Smart Schema Health Dashboard ---
// [AR] لوحة صحة قاعدة البيانات — تفحص المخطط وتولّد SQL للإصلاح اليدوي
// [EN] Introspects DB schema, shows issues, generates copy-paste SQL for phpPgAdmin
mountApiGet('/api/system/schema-health', protect, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const report = await getSchemaHealthReport();
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: 'Schema health check failed', details: e.message });
    }
});

// --- Force Re-run Migrations ---
mountApiGet('/api/system/force-migrate', adminOpsLimiter, protect, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const migrationReport = await runStartupMigrations();
        const healthReport = await getSchemaHealthReport();
        res.json({ migration: migrationReport, health: healthReport });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Route Mounting ---
// SSE real-time stream (must be before compression if any; exempt from rate-limit above)
mountApiGet('/api/events', protect, sseHandler);

// Public (no auth)
mountApiUse('/api/public/landing', landingRoutes);
mountApiUse('/api/public/contact', publicWriteLimiter, contactRoutes);
mountApiUse('/api/public/store', publicWriteLimiter, storeRoutes);
mountApiUse('/api/public/carbon-proxy', carbonRoutes);
mountApiUse('/api/permission-requests', requestsRoutes);
mountApiUse('/api/contact-submissions', contactRoutes);
mountApiUse('/api/config', settingsRoutes);
mountApiGet('/api/ping', systemController.getPing || ((req, res) => res.json({ status: 'ok' })));
mountApiUse('/api/ping', healthRoutes);

// Auth
app.use('/auth', authLimiter, loginRoutes);
mountApiUse('/api/auth', authLimiter, loginRoutes);
mountApiUse('/api/session', authLimiter, loginRoutes);
mountApiUse('/api/login', authLimiter, loginRoutes);

// Issue short-lived SSE token so URL never carries long-lived session JWT.
mountApiGet('/api/auth/sse-token', sseTokenLimiter, protect, (req, res) => {
    try {
        const jwtSecret = getJwtSecret();
        if (!jwtSecret) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            {
                id: req.user.id,
                role: req.user.role,
                company_id: req.user.company_id,
                project_id: req.user.project_id,
                supplier_id: req.user.supplier_id,
                purpose: 'sse'
            },
            jwtSecret,
            { expiresIn: '2m' }
        );

        return res.json({ token, expiresInSeconds: 120 });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to issue SSE token', details: e.message });
    }
});

// Protected routes
mountApiUse('/api/profile', protect, profileRoutes);
mountApiUse('/api/users', protect, usersRoutes);
mountApiUse('/api/companies', protect, companiesRoutes);
mountApiUse('/api/projects', protect, projectsRoutes);
mountApiUse('/api/services', protect, servicesRoutes);
mountApiUse('/api/facilities', protect, facilitiesRoutes);
mountApiUse('/api/trips', protect, tripsRoutes);
mountApiUse('/api/asset_requests', protect, assetRequestsRoutes);
mountApiUse('/api/requests', protect, requestsRoutes);
mountApiUse('/api/notifications', protect, notificationsRoutes);
mountApiUse('/api/vehicles', protect, vehiclesRoutes);
mountApiUse('/api/drivers', protect, driversRoutes);
mountApiUse('/api/inventory', protect, inventoryRoutes);
mountApiUse('/api/reporting/dashboard', protect, dashboardRoutes);
mountApiUse('/api/reporting/exports', protect, exportsRoutes);
mountApiUse('/api/suppliers', protect, suppliersRoutes);
mountApiUse('/api/project_services', protect, projectServicesRoutes);
mountApiUse('/api/project_supplier_rates', protect, supplierRatesRoutes);
mountApiUse('/api/asset-service-links', protect, assetServiceLinksRoutes);
mountApiGet('/api/logs', protect, authorizeRoles('ADMIN'), systemController.getLogs || ((req, res) => res.status(503).json({ error: 'Logs unavailable' })));
mountApiUse('/api/system/health', protect, authorizeRoles('ADMIN'), healthRoutes);
mountApiUse('/api/admin/health', protect, authorizeRoles('ADMIN'), healthRoutes);
mountApiGet('/api/system/metrics', adminOpsLimiter, protect, authorizeRoles('ADMIN'), systemController.getMetrics || ((req, res) => res.status(503).json({ error: 'Metrics unavailable' })));
mountApiGet('/api/admin/metrics', adminOpsLimiter, protect, authorizeRoles('ADMIN'), systemController.getMetrics || ((req, res) => res.status(503).json({ error: 'Metrics unavailable' })));
mountApiGet('/api/backup-status', adminOpsLimiter, protect, authorizeRoles('ADMIN'), systemController.getBackupStatusHandler || ((req, res) => res.status(503).json({ error: 'Backup status unavailable' })));
mountApiUse('/api/system/backup', adminOpsLimiter, protect, authorizeRoles('ADMIN'), backupRoutes);
mountApiUse('/api/admin/backup', adminOpsLimiter, protect, authorizeRoles('ADMIN'), backupRoutes);
mountApiUse('/api/opsbackup', adminOpsLimiter, protect, authorizeRoles('ADMIN'), backupRoutes);
mountApiUse('/api/system/settings', adminOpsLimiter, protect, authorizeRoles('ADMIN'), settingsRoutes);
mountApiUse('/api/admin/settings', adminOpsLimiter, protect, authorizeRoles('ADMIN'), settingsRoutes);

// --- WhatsApp QR Code Route ---
mountApiGet('/api/system/whatsapp/qr', protect, authorizeRoles('ADMIN'), (req, res) => {
    res.json(getQrCode());
});

// --- API-Only Runtime ---
// The frontend is deployed separately as a static app.
// Keep this runtime focused on API, auth, uploads, health, and service routes.

app.use((req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) {
        return res.status(404).json({ error: 'API endpoint not found', path: req.url });
    }
    return next();
});

app.use(notFound);
app.use(errorHandler);

// --- Server Start ---
const server = http.createServer(app);

const startServer = async (requestedPort) => {
    const parsedPort = Number(requestedPort);
    const effectivePort = Number.isNaN(parsedPort) ? 8080 : parsedPort;

    return new Promise((resolve, reject) => {
        const handleError = (err) => {
            server.removeListener('listening', handleListening);

            const canRetryOnNextPort =
                err && err.code === 'EADDRINUSE' &&
                process.env.NODE_ENV !== 'production' &&
                !process.env.PORT;

            if (canRetryOnNextPort) {
                const fallbackPort = effectivePort + 1;
                console.warn(`[GCM] Port ${effectivePort} is in use. Retrying on port ${fallbackPort}...`);
                return resolve(startServer(fallbackPort));
            }

            return reject(err);
        };

        const handleListening = () => {
            server.removeListener('error', handleError);
            console.log(`[GCM] Server running on port ${effectivePort}`);
            resolve(effectivePort);
        };

        server.once('error', handleError);
        server.once('listening', handleListening);
        server.listen(effectivePort);
    });
};

if (require.main === module) {
    // Full startup only in long-lived server mode.
    initializeStartupServices({ runHeavyServices: true })
        .then(() => {
            return startServer(port);
        })
        .catch((err) => {
            console.error(`[GCM] Startup services failed: ${err.message}`);
            if (process.env.NODE_ENV === 'production') {
                console.error('[GCM] Production startup aborted due to startup service failure.');
                process.exit(1);
            }
            // Non-production: keep local/dev recovery behavior to avoid blocking iteration.
            return startServer(port);
        });
} else {
    // Module/serverless mode: keep request path cold-start friendly by default.
    if (process.env.ENABLE_SERVERLESS_STARTUP_JOBS === 'true') {
        initializeStartupServices({ runHeavyServices: false })
            .catch(err => console.error(`[GCM] Module-mode startup services failed: ${err.message}`));
    } else {
        log('[GCM] Module mode detected. Startup jobs are skipped by default. Set ENABLE_SERVERLESS_STARTUP_JOBS=true to enable.');
    }

    module.exports = app;
    module.exports._startup = {
        policy: STARTUP_MODULE_POLICY,
        requireCritical,
        requireByStartupPolicy,
        processRole,
        enableInProcessJobsRequested,
        shouldRunInProcessJobs,
    };
}
