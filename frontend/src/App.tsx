import React, { ReactNode, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MantineProvider, createTheme, useMantineColorScheme } from '@mantine/core';
import { Map }
  from 'lucide-react';
import { useAppStore, useGCMStore, StoreInitializer } from '@/store';
import { motion } from 'framer-motion';
import { Role } from '@/types';
import { baseTheme } from '@/theme';
import { SkeletonFullPage } from '@/components/common/PageSkeleton';

/**
 * [AR] ملف التطبيق الرئيسي
 * [EN] Main Application Entry Point
 * 
 * Architecture:
 * - Uses React Router (HashRouter) for client-side routing.
 * - Wraps the entire app in `StoreProvider` for global state access.
 * - implements `ProtectedLayout` for authenticated routes.
 * - Handles theme switching (Dark/Light) via `ThemeHandler`.
 * - Uses React.lazy() for code splitting — each page is loaded on demand.
 */

/**
 * [AR] دالة التحميل الكسول المقاومة للأخطاء
 * تمنع توقف التطبيق في حال رفع تحديث جديد وتغيير أسماء ملفات الأصول (hashes).
 * تقوم بإعادة تحميل الصفحة تلقائياً مرة واحدة لجلب أحدث الملفات من الخادم.
 * 
 * [EN] Resilient Lazy Loading Helper
 * Prevents chunk loading failures when a new deployment updates asset hashes.
 * Automatically triggers a single page refresh to pull the latest chunk files from the server.
 */
const resilientLazy = (importFunc: () => Promise<any>) => {
  return React.lazy(() =>
    importFunc().catch((err) => {
      console.warn('[GCM] Chunk loading failed, triggering resilient reload:', err);
      const lastReload = sessionStorage.getItem('gcm_last_chunk_reload');
      const now = Date.now();
      // Only reload if the last reload was more than 10 seconds ago to prevent infinite reload loops
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('gcm_last_chunk_reload', String(now));
        window.location.reload();
      }
      return { default: () => null };
    })
  );
};

const Dashboard = resilientLazy(() => import('@/pages/Dashboard'));
const Companies = resilientLazy(() => import('@/pages/Companies'));
const Projects = resilientLazy(() => import('@/pages/Projects'));
const Trips = resilientLazy(() => import('@/pages/Trips'));
const Fleet = resilientLazy(() => import('@/pages/Fleet'));
const Inventory = resilientLazy(() => import('@/pages/Inventory'));
const Drivers = resilientLazy(() => import('@/pages/Drivers'));
const UserManagement = resilientLazy(() => import('@/pages/UserManagement'));
const ActivityLogs = resilientLazy(() => import('@/pages/ActivityLogs'));
const ReportsDashboard = resilientLazy(() => import('@/pages/ReportsDashboard'));
const AccountantPortal = resilientLazy(() => import('@/pages/AccountantPortal'));
const Services = resilientLazy(() => import('@/pages/Services'));
const EquipmentAdmin = resilientLazy(() => import('@/pages/EquipmentAdmin'));
const SystemMonitor = resilientLazy(() => import('@/pages/SystemMonitor'));
const Profile = resilientLazy(() => import('@/pages/Profile'));
const Settings = resilientLazy(() => import('@/pages/Settings'));
const Landing = resilientLazy(() => import('@/pages/Landing'));
const Store = resilientLazy(() => import('@/pages/Store'));
const Login = resilientLazy(() => import('@/pages/Login'));
const LandingSettings = resilientLazy(() => import('@/pages/LandingSettings'));
const Suppliers = resilientLazy(() => import('@/pages/Suppliers'));
const AISessions = resilientLazy(() => import('@/pages/AISessions'));
const Facilities = resilientLazy(() => import('@/pages/Facilities'));
const ShadyChat = resilientLazy(() => import('@/components/ai/ShadyChat'));
const ClientDashboard = resilientLazy(() => import('@/pages/client/ClientDashboard'));
const ClientReports = resilientLazy(() => import('@/pages/client/ClientReports'));
const ClientAccount = resilientLazy(() => import('@/pages/client/ClientAccount'));
const SubcontractorDashboard = resilientLazy(() => import('@/pages/subcontractor/SubcontractorDashboard'));
const TripQueue = resilientLazy(() => import('@/pages/logistics/TripQueue'));
const DriverDashboard = resilientLazy(() => import('@/pages/driver/DriverDashboard'));
const DriverMapView = resilientLazy(() => import('@/pages/driver/DriverMapView'));
const SubcontractorProfile = resilientLazy(() => import('@/pages/subcontractor/SubcontractorProfile'));
const SubcontractorAssets = resilientLazy(() => import('@/pages/subcontractor/SubcontractorAssets'));

// Layouts are kept eagerly loaded — they're part of the shell
import { ClientLayout } from '@/components/layout/ClientLayout';
import { SubcontractorLayout } from '@/components/layout/SubcontractorLayout';
import DriverLayout from '@/components/layout/DriverLayout';

import { useStore } from '@/context';
import { useLiveStream } from '@/hooks/useLiveStream';

/** Suspense fallback for lazy-loaded pages */
const PageFallback: React.FC = () => (
  <div className="p-4 md:p-10"><SkeletonFullPage variant="cards" /></div>
);


/**
 * [AR] ترجمة القوائم والواجهات الأساسية
 * [EN] UI & Menu translations
 */
const translations = {
  ar: { ops: 'العمليات', logistics: 'اللوجستيات', admin: 'الإدارة', dashboard: 'الرئيسية', companies: 'الشركات', projects: 'المشاريع', trips: 'الرحلات', reports: 'التحليلات', fleet: 'الأسطول', inventory: 'المخزون', drivers: 'الموظفين', suppliers: 'الموردين', facilities: 'المرافق', accounting: 'المحاسبة', users: 'الفريق', services: 'الخدمات', settings: 'الإعدادات', landing: 'الموقع', monitor: 'المراقبة', logout: 'خروج', cloud: 'بيانات السحاب', landingBtn: 'الموقع العام', logs: 'سجل الأنشطة', notifs: 'الإشعارات' },
  en: { ops: 'Operations', logistics: 'Logistics', admin: 'Admin', dashboard: 'Dashboard', companies: 'Companies', projects: 'Projects', trips: 'Trips', reports: 'Analytics', fleet: 'Fleet', inventory: 'Inventory', drivers: 'Staff Hub', suppliers: 'Suppliers Hub', facilities: 'Facilities Hub', accounting: 'Finance', users: 'Team', services: 'Services', settings: 'Settings', landing: 'Landing', monitor: 'Monitor', logout: 'Logout', cloud: 'Cloud Data', landingBtn: 'Public Site', logs: 'Activity Logs', notifs: 'Notifications' }
};


const ThemeHandler: React.FC = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { darkMode, saasConfig } = useStore();

  // Sync Store -> Mantine
  // This ensures that if the store changes (e.g. from Landing page or MainLayout), Mantine follows suit.
  useEffect(() => {
    const target = darkMode ? 'dark' : 'light';
    if (colorScheme !== target) {
      setColorScheme(target);
    }
  }, [darkMode, colorScheme, setColorScheme]);

  // Sync Mantine -> DOM (Tailwind)
  useEffect(() => {
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  // Sync Store -> DOM (Primary Color)
  useEffect(() => {
    if (saasConfig.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', saasConfig.primaryColor);
    }
  }, [saasConfig.primaryColor]);

  return null;
};


import { MainLayout } from '@/components/layout/MainLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';


// ProtectedLayout definition moved to components/layout/MainLayout.tsx


/**
 * [AR] المكون الرئيسي للتطبيق
 * [EN] Root App Component
 * 
 * Orchestrates the routing logic and global providers.
 */
// [AR] مكون حماية المسارات بناءً على الصلاحيات
// [EN] Role-Based Route Protection Component
const RoleBasedRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles: Role[] }) => {
  const { currentUser } = useStore();
  const isSuperUser = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);
  const isDataEntry = currentUser.role === Role.DATA_ENTRY;
  const isDriver = currentUser.role === Role.DRIVER;

  if (!allowedRoles.includes(currentUser.role)) {
    const role = currentUser.role;
    const CLIENT_ROLES = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER];

    if (CLIENT_ROLES.includes(role)) return <Navigate to="/client/dashboard" replace />;
    if (role === Role.SUBCONTRACTOR) return <Navigate to="/subcontractor/dashboard" replace />;
    if (role === Role.DRIVER) return <Navigate to="/db" replace />;

    return <Navigate to="/db" replace />;
  }

  return <>{children}</>;
};

const InternalLayout = () => {
  const { isAuthenticated, currentUser, saasConfig } = useStore();
  useLiveStream(); // [AR] البث اللحظي SSE — يتفعل فقط عند تسجيل الدخول
  const isAr = saasConfig.language === 'ar';

  if (!isAuthenticated) return <Navigate to="/" />;

  const STAFF_ROLES = [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER, Role.DRIVER];
  if (!STAFF_ROLES.includes(currentUser.role)) {
    const role = currentUser.role;
    if ([Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER].includes(role)) return <Navigate to="/client/dashboard" />;
    if (role === Role.SUBCONTRACTOR) return <Navigate to="/subcontractor/dashboard" />;
    return <Navigate to="/" />;
  }

  return (
    <MainLayout>
      <ErrorBoundary moduleName={isAr ? 'الصفحة الحالية' : 'Current Page'} isAr={isAr}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </MainLayout>
  );
};

const App = () => {
  const saasConfig = useGCMStore(state => state.saasConfig);
  const isAuthenticated = useGCMStore(state => state.isAuthenticated);
  const currentUser = useGCMStore(state => state.currentUser);
  const booting = useGCMStore(state => state.booting);

  // Back-compatibility for hooks that still need the aggregate object
  const store = useAppStore();

  // Dashboard: Admin, Accountant, Data Entry
  const DASHBOARD_ROLES = [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.DRIVER];

  // Client Roles
  const CLIENT_ROLES = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER];

  // All Internal Staff: Admin, Accountant, Data Entry, Logistics, Reports Manager
  const ALL_INTERNAL = [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER, Role.DRIVER];
  const ADMIN_ONLY = [Role.ADMIN];
  // Operations Staff: Admin, Logistics, Data Entry, Reports Manager
  const OPS_ROLES = [Role.ADMIN, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER];
  // Logistics roles
  const LOGISTICS_ROLES = [Role.ADMIN, Role.LOGISTICS, Role.DATA_ENTRY];

  // [EN] Export store methods to window for emergency access
  const setBooting = useGCMStore(state => state.setBooting);
  useEffect(() => {
    (window as any).gcm_store_internal = { setBooting };
  }, [setBooting]);

  // [AR] تحديث متغيرات الألوان لـ Tailwind - [EN] Update Tailwind CSS variables
  useEffect(() => {
    // Inject the primary color into CSS variables so Tailwind can use it
    if (store.saasConfig?.primaryColor) {
      let color = store.saasConfig.primaryColor;

      // Fallback map for accepted color names to HEX (Default 500 shade)
      const colorNames: Record<string, string> = {
        'emerald': '#10b981',
        'blue': '#3b82f6',
        'violet': '#8b5cf6',
        'rose': '#f43f5e',
        'orange': '#f59e0b',
        'slate': '#64748b'
      };

      if (colorNames[color]) {
        color = colorNames[color];
      }

      document.documentElement.style.setProperty('--primary-color', color);
    }
  }, [store.saasConfig?.primaryColor]);

  // [AR] إنشاء الثيم ديناميكيًا - [EN] Create dynamic theme
  const dynamicTheme = useMemo(() => {
    // Map hex colors to Mantine palette names if possible
    const colorMap: Record<string, string> = {
      '#10b981': 'emerald',
      '#3b82f6': 'blue',
      '#8b5cf6': 'violet',
      '#f43f5e': 'rose',
      '#f59e0b': 'orange',
    };

    // Find closest match or default to emerald
    let pColor = (store.saasConfig?.primaryColor && colorMap[store.saasConfig.primaryColor]) || 'emerald';

    // Safety check: specific theme safety
    const validColors = ['emerald', 'blue', 'violet', 'rose', 'orange'];
    if (!validColors.includes(pColor)) {
      pColor = 'emerald';
    }

    return createTheme({
      ...baseTheme,
      primaryColor: pColor,
    });
  }, [store.saasConfig?.primaryColor]);

  const isAr = store.saasConfig.language === 'ar';
  const bc = store.saasConfig.bootConfig || {};

  // Dynamic styles
  const bgColor = bc.backgroundColor || 'bg-slate-950';
  const textColor = bc.textColor || 'text-white';
  const accentColor = bc.accentColor || 'emerald-500';
  const accentHex = accentColor.includes('#') ? accentColor : undefined;

  return (
    <React.Fragment>
      <StoreInitializer />
      {(store.booting && !store.isAuthenticated) ? (
        <div className={`min-h-screen ${bgColor.startsWith('#') ? '' : bgColor} flex items-center justify-center p-8 overflow-hidden relative font-sans`}
          style={bgColor.startsWith('#') ? { backgroundColor: bgColor } : {}}>

          {/* Dynamic Glowing Decor */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2"
            style={{ backgroundColor: accentHex || `var(--primary-color)` }}
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.2, 0.1],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 left-0 w-[600px] h-[600px] blur-[150px] rounded-full translate-y-1/2 -translate-x-1/2"
            style={{ backgroundColor: accentHex || `var(--primary-color)` }}
          />

          <div className="flex flex-col items-center gap-12 relative z-10 w-full max-w-lg">
            {/* High-Tech Logo Container */}
            <div className="relative">
              {/* Outer Pulsing Ring */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-[-40px] border border-primary-500/20 rounded-[3.5rem] blur-sm"
              />

              {/* Orbital Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-20px] border-t-2 border-r-2 border-primary-500/40 rounded-[3rem]"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-10px] border-b-2 border-l-2 border-emerald-500/20 rounded-[2.5rem]"
              />

              {/* Main Container */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-40 h-40 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden p-6 border border-white/10"
              >
                {/* Scanline Effect */}
                <motion.div
                  animate={{ top: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1/2 bg-gradient-to-b from-transparent via-primary-500/10 to-transparent z-10"
                />

                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-full h-full relative z-20"
                >
                  {(store.saasConfig.logoUrl && store.saasConfig.logoUrl.startsWith('http')) ? (
                    <img src={store.saasConfig.logoUrl} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" alt="Logo" />
                  ) : (
                    <img src="/logo-light.png" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" alt="GCM Logo" />
                  )}
                </motion.div>
              </motion.div>
            </div>

            {/* Typography Section */}
            <div className="flex flex-col items-center text-center space-y-4">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-1"
              >
                <h2 className={`font-black text-5xl leading-none ${textColor.startsWith('#') ? '' : textColor} drop-shadow-2xl flex gap-x-4 justify-center flex-wrap ${isAr ? '' : 'tracking-tighter uppercase'}`}
                  style={textColor.startsWith('#') ? { color: textColor } : {}}>
                  {isAr ? (
                    // Arabic: Animate word-by-word to preserve ligatures
                    ((store.saasConfig.appNameAr) || 'GCM للخدمات البيئية').split(' ').map((word, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.5 + (i * 0.15), duration: 0.6 }}
                        className="inline-block"
                      >
                        {word}
                      </motion.span>
                    ))
                  ) : (
                    // English: Animate character-by-character for tech feel
                    ((store.saasConfig.appNameEn) || 'GCM Eco Services').split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (i * 0.05) }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </motion.span>
                    ))
                  )}
                </h2>

                {bc.showSlogan !== false && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-primary-500/60 text-[10px] font-black uppercase tracking-[0.6em]"
                    style={{ color: accentHex ? `${accentHex}99` : undefined }}
                  >
                    {(isAr ? store.saasConfig.appSloganAr : store.saasConfig.appSloganEn) || (isAr ? 'حلول بيئية متكاملة' : 'Integrated Eco Solutions')}
                  </motion.p>
                )}
              </motion.div>

              {/* Status Indicator */}
              <div className="pt-8 flex flex-col items-center gap-6">
                <div className="flex items-center gap-4 bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-xl">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.5, 1],
                          backgroundColor: ['#10b981', '#34d399', '#10b981']
                        }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full"
                      />
                    ))}
                  </div>
                  <motion.span
                    key={Math.floor(Date.now() / 3000)} // Flip status periodically
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase"
                  >
                    {isAr ? 'بدء تشغيل المحرك الرقمي' : 'Initializing Digital Engine'}
                  </motion.span>
                </div>

                {/* Emergency Control */}
                <motion.button
                  whileHover={{ scale: 1.1, color: '#10b981' }}
                  onClick={() => {
                    const s = (window as any).gcm_store_internal;
                    if (s && s.setBooting) s.setBooting(false);
                    else window.location.reload();
                  }}
                  className="text-[9px] font-black text-slate-600 uppercase tracking-widest transition-colors"
                >
                  {isAr ? 'تخطي التحميل (للطوارئ)' : 'Skip Loading (Emergency)'}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <MantineProvider theme={dynamicTheme} defaultColorScheme="auto">
          <Router>
            <ThemeHandler />
            <ErrorBoundary moduleName={isAr ? 'التطبيق' : 'Application'} isAr={isAr}>
              <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Explicit Landing Route - Accessible by everyone */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/store" element={<Store />} />
                <Route path="/home" element={<Navigate to="/landing" replace />} />

                {/* Public Routes */}
                <Route path="/" element={store.isAuthenticated ? <Navigate to={CLIENT_ROLES.includes(store.currentUser.role) ? "/client/dashboard" : store.currentUser.role === Role.SUBCONTRACTOR ? "/subcontractor/dashboard" : store.currentUser.role === Role.REPORTS_MANAGER ? "/rd" : "/db"} /> : <Landing />} />
                <Route path="/login" element={store.isAuthenticated ? <Navigate to={CLIENT_ROLES.includes(store.currentUser.role) ? "/client/dashboard" : store.currentUser.role === Role.SUBCONTRACTOR ? "/subcontractor/dashboard" : store.currentUser.role === Role.REPORTS_MANAGER ? "/rd" : "/db"} /> : <Login />} />

                {/* Client Portal */}
                <Route path="/client" element={!store.isAuthenticated ? <Navigate to="/" /> : CLIENT_ROLES.includes(store.currentUser.role) ? <ClientLayout /> : <Navigate to="/db" />}>
                  <Route index element={<Navigate to="dashboard" />} />
                  <Route path="dashboard" element={<ClientDashboard />} />
                  <Route path="reports" element={<ClientReports />} />
                  <Route path="account" element={<ClientAccount />} />
                  <Route path="support" element={<div className="p-10 text-center text-slate-400">{store.saasConfig.language === 'ar' ? 'وحدة الدعم الفني قادمة قريباً' : 'Support Module Coming Soon'}</div>} />
                </Route>

                {/* Subcontractor Portal */}
                <Route path="/subcontractor" element={!store.isAuthenticated ? <Navigate to="/" /> : store.currentUser.role === Role.SUBCONTRACTOR ? <SubcontractorLayout /> : <Navigate to="/db" />}>
                  <Route index element={<Navigate to="dashboard" />} />
                  <Route path="dashboard" element={<SubcontractorDashboard />} />
                  <Route path="profile" element={<SubcontractorProfile />} />
                  <Route path="assets" element={<SubcontractorAssets />} />
                </Route>

                {/* Driver Portal */}
                <Route path="/driver" element={!store.isAuthenticated ? <Navigate to="/" /> : store.currentUser.role === Role.DRIVER ? <DriverLayout /> : <Navigate to="/db" />}>
                  <Route index element={<DriverDashboard />} />
                  <Route path="map" element={<DriverMapView />} />
                </Route>


                {/* Internal Routes with Persistent Layout */}
                <Route element={<InternalLayout />}>
                  {/* Dashboard */}
                  <Route path="/db" element={<RoleBasedRoute allowedRoles={DASHBOARD_ROLES}><Dashboard /></RoleBasedRoute>} />

                  {/* Operations & Management */}
                  <Route path="/c" element={<RoleBasedRoute allowedRoles={[Role.ADMIN]}><Companies /></RoleBasedRoute>} />
                  <Route path="/p" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.COMPANY_USER, Role.PROJECT_USER]}><Projects /></RoleBasedRoute>} />
                  <Route path="/u" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.COMPANY_USER]}><UserManagement /></RoleBasedRoute>} />
                  {/* Trips */}
                  <Route path="/t" element={<RoleBasedRoute allowedRoles={OPS_ROLES}><Trips /></RoleBasedRoute>} />

                  {/* Reports */}
                  <Route path="/rd" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.REPORTS_MANAGER]}><ReportsDashboard /></RoleBasedRoute>} />

                  {/* Logistics */}
                  <Route path="/f" element={<RoleBasedRoute allowedRoles={LOGISTICS_ROLES}><Fleet /></RoleBasedRoute>} />
                  <Route path="/iv" element={<RoleBasedRoute allowedRoles={LOGISTICS_ROLES}><Inventory /></RoleBasedRoute>} />
                  <Route path="/dr" element={<RoleBasedRoute allowedRoles={LOGISTICS_ROLES}><Drivers /></RoleBasedRoute>} />
                  <Route path="/sup" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.LOGISTICS]}><Suppliers /></RoleBasedRoute>} />
                  <Route path="/fac" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.REPORTS_MANAGER]}><Facilities /></RoleBasedRoute>} />

                  {/* Trip Queue */}
                  <Route path="/logistics/queue" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.LOGISTICS, Role.REPORTS_MANAGER]}><TripQueue /></RoleBasedRoute>} />

                  {/* Admin & Finance */}
                  <Route path="/acc" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.ACCOUNTANT]}><AccountantPortal /></RoleBasedRoute>} />
                  <Route path="/u" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.COMPANY_USER]}><UserManagement /></RoleBasedRoute>} />
                  <Route path="/s" element={<RoleBasedRoute allowedRoles={[Role.ADMIN, Role.REPORTS_MANAGER]}><Services /></RoleBasedRoute>} />
                  <Route path="/store-admin" element={<RoleBasedRoute allowedRoles={[Role.ADMIN]}><EquipmentAdmin /></RoleBasedRoute>} />
                  <Route path="/st" element={<RoleBasedRoute allowedRoles={ADMIN_ONLY}><Settings /></RoleBasedRoute>} />
                  <Route path="/sys" element={<RoleBasedRoute allowedRoles={ADMIN_ONLY}><SystemMonitor /></RoleBasedRoute>} />
                  <Route path="/le" element={<RoleBasedRoute allowedRoles={ADMIN_ONLY}><LandingSettings /></RoleBasedRoute>} />
                  <Route path="/ai-sessions" element={<RoleBasedRoute allowedRoles={ADMIN_ONLY}><AISessions /></RoleBasedRoute>} />

                  {/* Activity Logs & Profile */}
                  <Route path="/l" element={<RoleBasedRoute allowedRoles={OPS_ROLES}><ActivityLogs /></RoleBasedRoute>} />
                  <Route path="/pr" element={<RoleBasedRoute allowedRoles={ALL_INTERNAL}><Profile /></RoleBasedRoute>} />

                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to={store.isAuthenticated ? (
                  [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER].includes(store.currentUser.role) ? "/client/dashboard" : 
                  store.currentUser.role === Role.SUBCONTRACTOR ? "/subcontractor/dashboard" : 
                  store.currentUser.role === Role.REPORTS_MANAGER ? "/rd" : "/db"
                ) : "/"} />} />
              </Routes>
              </Suspense>
              {store.isAuthenticated && store.currentUser?.role === Role.ADMIN && <Suspense fallback={null}><ShadyChat /></Suspense>}
            </ErrorBoundary>
          </Router>
        </MantineProvider>
      )}
    </React.Fragment>
  );
};

export default App;
