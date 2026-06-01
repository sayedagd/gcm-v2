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

// Environment Setup (load backend/.env FIRST before anything else)
const findEnv = () => {
    const paths = [path.join(__dirname, '.env')];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
};
dotenv.config({ path: findEnv() });

const app = express();
const port = process.env.PORT || 8080;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
const logModule = safeRequire('./src/shared/utils/logger', 'logger');
const log = logModule.log || console.log;

const dbModule = safeRequire('./database', 'database');
const query = dbModule.query || (() => Promise.reject(new Error('DB not loaded')));
const waitForDb = dbModule.waitForDb || (() => Promise.resolve());

const migrationModule = safeRequire('./src/shared/services/migrationService', 'migrationService');
const runStartupMigrations = migrationModule.runStartupMigrations || (() => Promise.resolve());
const getSchemaHealthReport = migrationModule.getSchemaHealthReport || (() => Promise.resolve({ status: 'UNAVAILABLE' }));

const backupModule = safeRequire('./src/shared/services/backupService', 'backupService');
const initBackupScheduler = backupModule.initBackupScheduler || (() => {});
const BACKUPS_DIR = backupModule.BACKUPS_DIR || path.join(__dirname, 'backups');



const errorMiddleware = safeRequire('./src/shared/middleware/errorMiddleware', 'errorMiddleware');
const errorHandler = errorMiddleware.errorHandler || ((err, req, res, next) => res.status(500).json({ error: err.message }));
const notFound = errorMiddleware.notFound || ((req, res) => res.status(404).json({ error: 'Not Found' }));

const { sseHandler } = require('./src/shared/services/eventBus');

const authMiddleware = safeRequire('./src/shared/middleware/authMiddleware', 'authMiddleware');
const protect = authMiddleware.protect || ((req, res, next) => next());
const authorizeRoles = authMiddleware.authorizeRoles || (() => (req, res, next) => next());

const whatsappModule = safeRequire('./src/shared/services/whatsappService', 'whatsappService');
const initWhatsApp = whatsappModule.initWhatsApp || (() => {});
const getQrCode = whatsappModule.getQrCode || (() => ({ isReady: false, qrCode: null }));

// Ensure backup directory
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// --- Initialize startup services (async, non-blocking) ---
(async () => {
    // Initialize WhatsApp service independently of the Database
    initWhatsApp();

    try {
        await waitForDb();
        await runStartupMigrations();
        initBackupScheduler();
        log('[GCM] All startup services initialized successfully');
    } catch (e) {
        console.error(`[GCM] Startup services warning: ${e.message}`);
    }
})();

// --- Rate Limiting ---
let globalLimiter = (req, res, next) => next();
let authLimiter = (req, res, next) => next();

if (rateLimit) {
    globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later' },
        skip: (req) => req.url.startsWith('/api/events')
    });
    authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts, please try again later' }
    });
}

// --- Import Route Modules (all safe-loaded) ---
const loginRoutes = safeRequire('./src/modules/auth/login/login.routes', 'login');
const profileRoutes = safeRequire('./src/modules/auth/profile/profile.routes', 'profile');
const usersRoutes = safeRequire('./src/modules/auth/users/users.routes', 'users');
const companiesRoutes = safeRequire('./src/modules/core/companies/companies.routes', 'companies');
const projectsRoutes = safeRequire('./src/modules/core/projects/projects.routes', 'projects');
const servicesRoutes = safeRequire('./src/modules/core/services/services.routes', 'services');
const facilitiesRoutes = safeRequire('./src/modules/core/facilities/facilities.routes', 'facilities');
const tripsRoutes = safeRequire('./src/modules/operations/trips/trips.routes', 'trips');
const requestsRoutes = safeRequire('./src/modules/operations/requests/requests.routes', 'requests');
const notificationsRoutes = safeRequire('./src/modules/operations/notifications/notifications.routes', 'notifications');
const assetRequestsRoutes = safeRequire('./src/modules/operations/asset_requests/asset_requests.routes', 'asset_requests');
const vehiclesRoutes = safeRequire('./src/modules/logistics/vehicles/vehicles.routes', 'vehicles');
const driversRoutes = safeRequire('./src/modules/logistics/drivers/drivers.routes', 'drivers');
const inventoryRoutes = safeRequire('./src/modules/logistics/inventory/inventory.routes', 'inventory');
const dashboardRoutes = safeRequire('./src/modules/reporting/dashboard/dashboard.routes', 'dashboard');
const exportsRoutes = safeRequire('./src/modules/reporting/exports/exports.routes', 'exports');
const logsRoutes = safeRequire('./src/modules/reporting/logs/logs.routes', 'logs');
const landingRoutes = safeRequire('./src/modules/public/landing/landing.routes', 'landing');
const contactRoutes = safeRequire('./src/modules/public/contact/contact.routes', 'contact');
const storeRoutes = safeRequire('./src/modules/public/store/store.routes', 'store');
const carbonRoutes = safeRequire('./src/modules/public/carbon/carbon.routes', 'carbon');
const shadiRoutes = safeRequire('./src/modules/ai/shadi/shadi.routes', 'shadi');
const aiAnalyticsRoutes = safeRequire('./src/modules/ai/analytics/analytics.routes', 'ai-analytics');
const ocrRoutes = safeRequire('./src/modules/ai/ocr/ocr.routes', 'ocr');
const healthRoutes = safeRequire('./src/modules/infrastructure/health/health.routes', 'health');
const backupRoutes = safeRequire('./src/modules/infrastructure/backup/backup.routes', 'backup');
const settingsRoutes = safeRequire('./src/modules/infrastructure/settings/settings.routes', 'settings');
const suppliersRoutes = safeRequire('./src/modules/logistics/suppliers/suppliers.routes', 'suppliers');
const projectServicesRoutes = safeRequire('./src/modules/core/project_services/project_services.routes', 'project_services');
const supplierRatesRoutes = safeRequire('./src/modules/core/supplier_rates/supplier_rates.routes', 'supplier_rates');
const assetServiceLinksRoutes = safeRequire('./src/modules/logistics/asset_service_links/assetServiceLinks.routes', 'asset_service_links');

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
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
    process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:5173' : null,
].filter(Boolean);

const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients and same-origin server calls.
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (allowVercelPreviews && origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(globalLimiter);
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Diagnostic Route (ALWAYS first, helps verify Node.js is executing) ---
app.get('/api/diag', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString()
    });
});

// --- Smart Schema Health Dashboard ---
// [AR] لوحة صحة قاعدة البيانات — تفحص المخطط وتولّد SQL للإصلاح اليدوي
// [EN] Introspects DB schema, shows issues, generates copy-paste SQL for phpPgAdmin
app.get('/api/system/schema-health', protect, authorizeRoles('ADMIN'), async (req, res) => {
    try {
        const report = await getSchemaHealthReport();
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: 'Schema health check failed', details: e.message });
    }
});

// --- Force Re-run Migrations ---
app.get('/api/system/force-migrate', protect, authorizeRoles('ADMIN'), async (req, res) => {
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
app.get('/api/events', protect, sseHandler);

// Public (no auth)
app.use('/api/public/landing', landingRoutes);
app.use('/api/public/contact', contactRoutes);
app.use('/api/public/store', storeRoutes);
app.use('/api/public/carbon-proxy', carbonRoutes);
app.use('/api/permission-requests', requestsRoutes);
app.use('/api/contact-submissions', contactRoutes);
app.use('/api/config', settingsRoutes);
app.use('/api/ping', healthRoutes);
app.use('/api/uploads', express.static(UPLOADS_DIR));

// Auth
app.use('/auth', authLimiter, loginRoutes);
app.use('/api/auth', authLimiter, loginRoutes);

// Protected routes
app.use('/api/profile', protect, profileRoutes);
app.use('/api/users', protect, usersRoutes);
app.use('/api/companies', protect, companiesRoutes);
app.use('/api/projects', protect, projectsRoutes);
app.use('/api/services', protect, servicesRoutes);
app.use('/api/facilities', protect, facilitiesRoutes);
app.use('/api/trips', protect, tripsRoutes);
app.use('/api/asset_requests', protect, assetRequestsRoutes);
app.use('/api/requests', protect, requestsRoutes);
app.use('/api/notifications', protect, notificationsRoutes);
app.use('/api/vehicles', protect, vehiclesRoutes);
app.use('/api/drivers', protect, driversRoutes);
app.use('/api/inventory', protect, inventoryRoutes);
app.use('/api/reporting/dashboard', protect, dashboardRoutes);
app.use('/api/reporting/exports', protect, exportsRoutes);
app.use('/api/reporting/logs', protect, logsRoutes);
app.use('/api/suppliers', protect, suppliersRoutes);
app.use('/api/project_services', protect, projectServicesRoutes);
app.use('/api/project_supplier_rates', protect, supplierRatesRoutes);
app.use('/api/asset-service-links', protect, assetServiceLinksRoutes);
app.use('/api/logs', protect, logsRoutes);
app.use('/api/ai/ocr', protect, ocrRoutes);
app.use('/api/ai', protect, shadiRoutes);
app.use('/api/ai', protect, aiAnalyticsRoutes);
app.use('/api/system/health', protect, authorizeRoles('ADMIN'), healthRoutes);
app.use('/api/system/backup', protect, authorizeRoles('ADMIN'), backupRoutes);
app.use('/api/system/settings', protect, authorizeRoles('ADMIN'), settingsRoutes);

// --- WhatsApp QR Code Route ---
app.get('/api/system/whatsapp/qr', protect, authorizeRoles('ADMIN'), (req, res) => {
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

if (require.main === module) {
    // Run migrations BEFORE accepting traffic — ensures schema is always up-to-date
    waitForDb()
        .then(() => runStartupMigrations())
        .then(() => {
            server.listen(port, () => console.log(`[GCM] Server running on port ${port}`));
        })
        .catch((err) => {
            console.error(`[GCM] Startup migration failed: ${err.message}`);
            // Still start server even if migration fails — don't block traffic
            server.listen(port, () => console.log(`[GCM] Server running on port ${port} (migration failed)`));
        });
} else {
    // Module/serverless mode
    // Run migrations asynchronously in the background
    waitForDb()
        .then(() => {
            console.log(`[GCM] Module mode detected. Starting background migrations...`);
            return runStartupMigrations();
        })
        .catch(err => console.error(`[GCM] Module-mode startup migration failed: ${err.message}`));

    module.exports = app;
}
