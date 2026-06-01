import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '@/pages/Login';
import { useStore } from '@/context';

vi.mock('@/context');

vi.mock('lucide-react', () => {
  const MockIcon = () => <div data-testid="lucide-icon" />;
  return {
    Building2: MockIcon, MapPin: MockIcon, ArrowRight: MockIcon, UserCheck: MockIcon,
    Truck: MockIcon, HardHat: MockIcon, Activity: MockIcon, FileText: MockIcon,
    FileCheck: MockIcon, Recycle: MockIcon, Package: MockIcon, Navigation: MockIcon,
    AlertCircle: MockIcon, Upload: MockIcon, Wand2: MockIcon, X: MockIcon, CheckCircle2: MockIcon,
    ChevronDown: MockIcon, Image: MockIcon, FileIcon: MockIcon, Trash2: MockIcon,
    Briefcase: MockIcon, Filter: MockIcon, FileDown: MockIcon, Eye: MockIcon, DownloadCloud: MockIcon,
    Edit2: MockIcon, Plus: MockIcon, Search: MockIcon, Calendar: MockIcon, Settings: MockIcon, 
    Menu: MockIcon, Bell: MockIcon, ChevronLeft: MockIcon, ChevronRight: MockIcon, 
    ChevronUp: MockIcon, Download: MockIcon, Check: MockIcon, Circle: MockIcon, Loader2: MockIcon,
    LayoutGrid: MockIcon, List: MockIcon, Zap: MockIcon, ShieldCheck: MockIcon, DollarSign: MockIcon,
    HelpCircle: MockIcon, User: MockIcon, Key: MockIcon, Clock: MockIcon, Edit3: MockIcon,
    Shield: MockIcon, Map: MockIcon, ShieldAlert: MockIcon, PlusCircle: MockIcon, LogIn: MockIcon,
    LogOut: MockIcon, Database: MockIcon, ScrollText: MockIcon, Info: MockIcon, Camera: MockIcon,
    Home: MockIcon, Globe: MockIcon, UserPlus: MockIcon, Save: MockIcon, BarChart2: MockIcon,
    PieChart: MockIcon, TrendingUp: MockIcon, FileSpreadsheet: MockIcon, Wrench: MockIcon,
    Mail: MockIcon
  };
});

vi.mock('framer-motion', () => ({
    motion: new Proxy({}, {
        get: (_: any, prop: string) => {
            if (typeof prop === 'symbol') return undefined;
            return ({ children, className }: any) => <div className={className}>{children}</div>;
        }
    })
}));

vi.mock('@/components/auth/LoginForm', () => ({
    default: () => <div data-testid="mock-login-form">Login Form</div>
}));

const mockStore = {
    saasConfig: { language: 'en', appNameEn: 'GCM ERP', appNameAr: 'نظام GCM' },
    darkMode: false,
    setDarkMode: vi.fn(),
    updateSaaS: vi.fn()
};

const renderComponent = () => render(
    <MemoryRouter><Login /></MemoryRouter>
);

describe('Login Page module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    });

    it('Scenario 1: Renders login with branding', async () => {
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('GCM ERP')).toBeInTheDocument();
            expect(screen.getByText('Unified Management Portal')).toBeInTheDocument();
            expect(screen.getByTestId('mock-login-form')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Back to Home link exists', () => {
        renderComponent();
        expect(screen.getByText('Back to Home')).toBeInTheDocument();
    });

    it('Scenario 3: Arabic mode shows Arabic branding', async () => {
        (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockStore,
            saasConfig: { ...mockStore.saasConfig, language: 'ar' }
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByText('نظام GCM')).toBeInTheDocument();
            expect(screen.getByText('بوابة النظام الإداري الموحد')).toBeInTheDocument();
        });
    });
});
