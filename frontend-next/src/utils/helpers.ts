/**
 * =====================================================
 * [AR] ملف الدوال المساعدة المشتركة
 * [EN] Common Helper Utilities
 * =====================================================
 * 
 * [AR] يحتوي على الدوال المستخدمة في أكثر من صفحة
 * [EN] Contains functions used across multiple pages
 */

import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

// =====================================================
// [AR] دوال تنسيق الأرقام
// [EN] Number Formatting Functions
// =====================================================

/**
 * [AR] تنسيق الأرقام بفواصل الآلاف
 * [EN] Format numbers with thousand separators
 * 
 * @param value - [AR] القيمة المراد تنسيقها | [EN] Value to format
 * @param decimals - [AR] عدد الخانات العشرية | [EN] Number of decimal places
 * @returns [AR] النص المنسق | [EN] Formatted string
 */
export const formatNumber = (value: number | string | undefined, decimals: number = 0): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (value === null || isNaN(num as number) || num === undefined) {
        return (0).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    return (num as number).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

/**
 * [AR] تنسيق المبالغ المالية
 * [EN] Format currency amounts
 * 
 * @param amount - [AR] المبلغ | [EN] Amount
 * @param currency - [AR] العملة | [EN] Currency code
 * @param isAr - [AR] هل اللغة عربية | [EN] Is Arabic language
 * @returns [AR] المبلغ المنسق | [EN] Formatted amount
 */
export const formatCurrency = (
    amount: number | string | undefined,
    currency: string = 'SAR',
    isAr: boolean = false
): string => {
    const formatted = formatNumber(amount, 2);
    const currencyLabel = isAr ? 'ر.س' : currency;
    return `${formatted} ${currencyLabel}`;
};

// =====================================================
// [AR] دوال تنسيق التواريخ
// [EN] Date Formatting Functions
// =====================================================

/**
 * [AR] تنسيق التاريخ بصيغة محددة
 * [EN] Format date with specific pattern
 * 
 * @param date - [AR] التاريخ | [EN] Date
 * @param pattern - [AR] النمط | [EN] Pattern
 * @param isAr - [AR] هل اللغة عربية | [EN] Is Arabic
 * @returns [AR] التاريخ المنسق | [EN] Formatted date
 */
export const formatDate = (
    date: Date | string,
    pattern: string = 'yyyy-MM-dd',
    isAr: boolean = false
): string => {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, pattern, isAr ? { locale: ar } : {});
    } catch {
        return '---';
    }
};

/**
 * [AR] الحصول على تاريخ اليوم
 * [EN] Get today's date
 * 
 * @param pattern - [AR] النمط | [EN] Pattern
 * @returns [AR] تاريخ اليوم | [EN] Today's date
 */
export const getToday = (pattern: string = 'yyyy-MM-dd'): string => {
    return format(new Date(), pattern);
};

/**
 * [AR] الحصول على الوقت الحالي
 * [EN] Get current time
 * 
 * @param pattern - [AR] النمط | [EN] Pattern
 * @returns [AR] الوقت الحالي | [EN] Current time
 */
export const getCurrentTime = (pattern: string = 'HH:mm'): string => {
    return format(new Date(), pattern);
};

/**
 * [AR] حساب نسبة التقدم الزمني
 * [EN] Calculate time progress percentage
 */
export const calculateTimeProgress = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();

    if (end <= start) return 100;
    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
};





// =====================================================
// [AR] دوال الصور والروابط المشتركة
// [EN] Shared Image & Link Utilities
// =====================================================

/**
 * [AR] ضغط الصور لتصغير الحجم
 * [EN] Compress images to reduce size
 */
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1600;
                let width = img.width;
                let height = img.height;

                // [AR] الحفاظ على نسبة العرض إلى الارتفاع (Aspect Ratio) أثناء التصغير
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    // [AR] جعل الخلفية بيضاء دائماً لمنع تحول الصور الشفافة للون الأسود
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                // [AR] إرجاع الصورة بصيغة JPEG لتقليل الحجم ولأننا أزلنا الشفافية (مفيد جداً للـ OCR)
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

/**
 * [AR] الحصول على رابط تضمين الخريطة
 * [EN] Get Map Embed URL
 */
export const getMapEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/q=([\d.-]+,[\d.-]+)/);
    const coords = match ? match[1] : null;
    if (coords) return `https://maps.google.com/maps?q=${coords}&z=15&output=embed`;
    if (url.includes('google.com/maps')) {
        const qMatch = url.match(/[?&]q=([^&]+)/);
        if (qMatch) return `https://maps.google.com/maps?q=${qMatch[1]}&z=15&output=embed`;
    }
    return null;
};

/**
 * [AR] استخراج الإحداثيات من رابط أو نص الخريطة
 * [EN] Extract coordinates from map URL or string
 */
export const extractCoordinates = (url?: string): [number, number] | null => {
    if (!url) return null;
    // Support formats: q=24.123,45.456 or plain 24.123, 45.456
    const match = url.match(/([2-3]\d\.\d+,\s?[4-5]\d\.\d+)/);
    if (match) {
        const parts = match[0].split(',').map(p => parseFloat(p.trim()));
        const lat = parts[0];
        const lng = parts[1];
        if (parts.length === 2 && lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            return [lat, lng] as [number, number];
        }
    }
    return null;
};

/**
 * [AR] حل مسار الصورة (دعم Base64 و الروابط المباشرة)
 * [EN] Resolve image path (Supports Base64 and direct URLs)
 */
export const resolveImagePath = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('data:')) return path; // Base64
    if (path.startsWith('http')) return path; // Complete URL

    // Check if it's already a relative path with /uploads
    if (path.startsWith('/uploads')) {
        // Fallback to current window origin if env is not perfect
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}${path}`;
    }

    return path;
};

/**
 * [AR] معالجة خطأ تحميل الصورة وتعيين مسار بديل بذكاء
 * [EN] Handle image load errors and set fallback smartly to prevent infinite rendering loops
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string = '/assets/logo_gcm.png') => {
    const target = e.currentTarget;
    
    // Prevent infinite loop if the fallback itself fails to load
    if (target.dataset.fallbackApplied === 'true') {
        target.style.display = 'none';
        // Safe transparent 1x1 pixel instead of empty string which triggers another error in some browsers
        target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        return;
    }

    target.dataset.fallbackApplied = 'true';
    target.src = fallbackUrl;
    target.className = target.className.replace('object-cover', 'object-contain') + ' p-2 bg-white dark:bg-slate-800';
};
// =====================================================
// [AR] دوال تنسيق الحالة والأدوار
// [EN] Status & Role Formatting Functions
// =====================================================

/**
 * [AR] تنسيق دور المستخدم
 * [EN] Format user role to readable text
 */
export const formatRole = (role: string, isAr: boolean = false): string => {
    const roles: Record<string, { ar: string, en: string }> = {
        'ADMIN': { ar: 'مدير النظام', en: 'System Admin' },
        'COMPANY_USER': { ar: 'مسؤول شركة', en: 'Company Admin' },
        'PROJECT_USER': { ar: 'مشرف موقع (عميل)', en: 'Client Site Supervisor' },
        'ACCOUNTANT': { ar: 'محاسب مالي', en: 'Accountant' },
        'DATA_ENTRY': { ar: 'مدخل بيانات', en: 'Data Entry' },
        'REPORTS_MANAGER': { ar: 'مدير التقارير', en: 'Reports Manager' },
        'LOGISTICS': { ar: 'مسؤول لوجستيات', en: 'Logistics Manager' },
        'DRIVER': { ar: 'سائق', en: 'Driver' },
        'CLIENT': { ar: 'عميل', en: 'Client' },
        'SUBCONTRACTOR': { ar: 'مورد', en: 'Subcontractor' },
        'STAFF': { ar: 'مشرف موقع (GCM)', en: 'GCM Site Supervisor' },
    };

    const key = role?.toUpperCase();
    if (roles[key]) {
        return isAr ? roles[key].ar : roles[key].en;
    }
    return role || '';
};

/**
 * [AR] تنسيق حالة الرحلة
 * [EN] Format trip status to readable text
 */
export const formatTripStatus = (status: string, isAr: boolean = false): string => {
    const statuses: Record<string, { ar: string, en: string }> = {
        'REQUESTED': { ar: 'تم الطلب', en: 'Requested' },
        'ASSIGNED': { ar: 'تم التعيين', en: 'Assigned' },
        'EN_ROUTE': { ar: 'في الطريق', en: 'En Route' },
        'LOADING': { ar: 'جاري التحميل', en: 'Loading' },
        'PENDING_APPROVAL': { ar: 'بانتظار الموافقة', en: 'Pending Approval' },
        'IN_PROGRESS': { ar: 'قيد التنفيذ', en: 'In Progress' },
        'PENDING_DOCS': { ar: 'بانتظار المستندات', en: 'Pending Docs' },
        'PENDING_REVIEW': { ar: 'بانتظار المراجعة', en: 'Pending Review' },
        'COMPLETED': { ar: 'مكتملة', en: 'Completed' },
        'CANCELLED': { ar: 'ملغية', en: 'Cancelled' },
    };

    const key = status?.toUpperCase();
    if (statuses[key]) {
        return isAr ? statuses[key].ar : statuses[key].en;
    }
    return status || '';
};

/**
 * [AR] تنسيق حالة الرحلة حسب دور المستخدم
 * [EN] Format trip status based on user role
 */
export const formatTripStatusByRole = (status: string, role: string, isAr: boolean = false): string => {
    const key = status?.toUpperCase();
    
    // [AR] حالات العميل (4 حالات فقط)
    // [EN] Client View (4 simplified statuses)
    if (role === 'CLIENT' || role === 'COMPANY_USER' || role === 'PROJECT_USER') {
        const clientStatuses: Record<string, { ar: string, en: string }> = {
            'REQUESTED': { ar: 'في الطريق إليك', en: 'En Route to site' },
            'ASSIGNED': { ar: 'في الطريق إليك', en: 'En Route to site' },
            'EN_ROUTE': { ar: 'في الطريق إليك', en: 'En Route to site' },
            'LOADING': { ar: 'تم التحميل', en: 'Loaded' },
            'PENDING_APPROVAL': { ar: 'تم التحميل', en: 'Loaded' },
            'IN_PROGRESS': { ar: 'في طريقها للمردم', en: 'Heading to Landfill' },
            'PENDING_DOCS': { ar: 'مكتملة وبانتظار المانفيست', en: 'Completed - Pending Manifest' },
            'PENDING_REVIEW': { ar: 'مكتملة وبانتظار المانفيست', en: 'Completed - Pending Manifest' },
            'COMPLETED': { ar: 'مكتملة ✅', en: 'Completed ✅' },
            'CANCELLED': { ar: 'ملغية', en: 'Cancelled' },
        };
        return isAr ? (clientStatuses[key]?.ar || status) : (clientStatuses[key]?.en || status);
    }

    // [AR] حالات السائق (حالات تشغيلية دقيقة)
    // [EN] Driver View (Operational statuses)
    if (role === 'DRIVER') {
        const driverStatuses: Record<string, { ar: string, en: string }> = {
            'ASSIGNED': { ar: 'مهمة جديدة', en: 'New Mission' },
            'EN_ROUTE': { ar: 'في الطريق للموقع', en: 'Heading to Site' },
            'LOADING': { ar: 'جاري التحميل الآن', en: 'Loading Now' },
            'PENDING_APPROVAL': { ar: 'بانتظار توقيع العميل', en: 'Client Sign-off' },
            'IN_PROGRESS': { ar: 'في الطريق للمردم', en: 'Heading to Landfill' },
            'PENDING_DOCS': { ar: 'رفع إيصال المردم', en: 'Upload Receipt' },
            'PENDING_REVIEW': { ar: 'اكتملت المهمة ✅', en: 'Mission Done' },
            'COMPLETED': { ar: 'مؤرشفة', en: 'Archived' },
            'CANCELLED': { ar: 'ملغية', en: 'Cancelled' },
        };
        return isAr ? (driverStatuses[key]?.ar || status) : (driverStatuses[key]?.en || status);
    }

    // [AR] الافتراضي (الآدمن والموظفين)
    // [EN] Default (Admin & Staff)
    return formatTripStatus(status, isAr);
};

/**
 * [AR] ألوان حالة الرحلة
 * [EN] Get trip status color classes for badges/UI
 */
export const getTripStatusColor = (status: string): { bg: string; text: string; border: string; solidBg: string } => {
    const colors: Record<string, { bg: string; text: string; border: string; solidBg: string }> = {
        'REQUESTED': { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300/30', solidBg: 'bg-amber-500 text-white border-amber-500' },
        'ASSIGNED': { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-300/30', solidBg: 'bg-indigo-500 text-white border-indigo-500' },
        'EN_ROUTE': { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-300/30', solidBg: 'bg-cyan-500 text-white border-cyan-500' },
        'LOADING': { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-300/30', solidBg: 'bg-orange-500 text-white border-orange-500' },
        'PENDING_APPROVAL': { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300/30', solidBg: 'bg-purple-500 text-white border-purple-500' },
        'IN_PROGRESS': { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300/30', solidBg: 'bg-blue-500 text-white border-blue-500' },
        'PENDING_DOCS': { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300/30', solidBg: 'bg-amber-500 text-white border-amber-500' },
        'PENDING_REVIEW': { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-300/30', solidBg: 'bg-violet-500 text-white border-violet-500' },
        'COMPLETED': { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300/30', solidBg: 'bg-emerald-500 text-white border-emerald-500' },
        'CANCELLED': { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-300/30', solidBg: 'bg-red-500 text-white border-red-500' },
    };
    return colors[status?.toUpperCase()] || { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-200', solidBg: 'bg-gray-500 text-white border-gray-500' };
};


/**
 * [AR] ألوان أولوية الرحلة
 * [EN] Get trip priority color classes
 */
export const getTripPriorityColor = (priority: string): { bg: string; text: string; dot: string; solidBg: string } => {
    const defaultPriorityColor = { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', solidBg: 'bg-blue-500 text-white border-blue-500' };
    const colors: Record<string, { bg: string; text: string; dot: string; solidBg: string }> = {
        'URGENT': { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', solidBg: 'bg-red-500 text-white border-red-500' },
        'HIGH': { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', solidBg: 'bg-orange-500 text-white border-orange-500' },
        'NORMAL': { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', solidBg: 'bg-blue-500 text-white border-blue-500' },
        'LOW': { bg: 'bg-gray-500/10 dark:bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500', solidBg: 'bg-gray-600 text-white border-gray-600' },
    };
    return colors[priority?.toUpperCase()] ?? defaultPriorityColor;
};

/**
 * [AR] تنسيق نوع العملية
 * [EN] Format action type to readable text
 */
export const formatActionType = (action: string, isAr: boolean = false): string => {
    const actions: Record<string, { ar: string, en: string }> = {
        'CREATED': { ar: 'إنشاء', en: 'Created' },
        'UPDATED': { ar: 'تحديث', en: 'Updated' },
        'DELETED': { ar: 'حذف', en: 'Deleted' },
        'LOGIN': { ar: 'تسجيل دخول', en: 'Login' },
        'LOGOUT': { ar: 'تسجيل خروج', en: 'Logout' },
        'UPLOAD': { ar: 'رفع ملف', en: 'Upload' },
        'SETTINGS_CHANGE': { ar: 'تغيير إعدادات', en: 'Settings Change' },
        'EXPORT': { ar: 'تصدير بيانات', en: 'Export' },
        'IMPORT': { ar: 'استيراد بيانات', en: 'Import' },
        'UPDATE_PROFILE': { ar: 'تحديث الملف الشخصي', en: 'Update Profile' },
    };

    const key = action?.toUpperCase();
    if (actions[key]) {
        return isAr ? actions[key].ar : actions[key].en;
    }
    return action || '';
};

/**
 * [AR] تنسيق تفاصيل السجل (تحويل JSON إلى نص مقروء)
 * [EN] Format log details (Convert JSON to readable text)
 */
export const formatLogDetails = (details: string | undefined): string => {
    if (!details) return '---';
    if (!details.trim().startsWith('{')) return details;

    try {
        const parsed = JSON.parse(details);
        return Object.entries(parsed)
            .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
            .join(' | ');
    } catch (e) {
        return details;
    }
};

/**
 * [AR] تنسيق نوع الكيان
 * [EN] Format entity type to readable text
 */
export const formatEntityType = (entity: string, isAr: boolean = false): string => {
    const entities: Record<string, { ar: string, en: string }> = {
        'USER': { ar: 'مستخدم', en: 'User' },
        'PROJECT': { ar: 'مشروع', en: 'Project' },
        'TRIP': { ar: 'رحلة', en: 'Trip' },
        'VEHICLE': { ar: 'مركبة', en: 'Vehicle' },
        'DRIVER': { ar: 'سائق', en: 'Driver' },
        'COMPANY': { ar: 'شركة', en: 'Company' },
        'SERVICE': { ar: 'خدمة', en: 'Service' },
        'RATE': { ar: 'سعر', en: 'Rate' },
        'LANDING': { ar: 'الصفحة الهبوط', en: 'Landing' },
        'SUPPLIER': { ar: 'مورد', en: 'Supplier' },
        'CONTAINER': { ar: 'حاوية', en: 'Container' },
        'TANK': { ar: 'خزان', en: 'Tank' },
    };

    const key = entity?.toUpperCase();
    if (entities[key]) {
        return isAr ? entities[key].ar : entities[key].en;
    }
    return entity || '';
};

/**
 * [AR] تحليل المصفوفة بشكل آمن
 * [EN] Safely parse array from string or return as is
 */
export const safeParseArray = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            // Check if it looks like a JSON array
            if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [value];
            }
            // Assume comma separated if contains comma and no brackets (optional, but safer to just return as single item if not sure)
            // For now, treat as single item if simple string
            return [value];
        } catch (e) {
            return [value];
        }
    }
    return [];
};
// =====================================================
// [AR] دوال معالجة المستندات والتحميل
// [EN] Document Processing & Download Utilities
// =====================================================

/**
 * [AR] تحديد نوع الملف وامتداده من البيانات
 * [EN] Identify MIME type and extension from data
 */
export const getMimeAndExtension = (source: string): { mime: string; ext: string } => {
    if (!source) return { mime: 'image/png', ext: '.png' };

    if (source.startsWith('data:')) {
        const match = source.match(/^data:(.*);base64,/);
        const mime = match?.[1] || 'image/png';
        let ext = '.png';
        
        if (mime.includes('pdf')) ext = '.pdf';
        else if (mime.includes('jpeg')) ext = '.jpg';
        else if (mime.includes('png')) ext = '.png';
        else ext = `.${mime.split('/')[1] || 'png'}`;
        
        return { mime, ext };
    }

    // Default for URLs without explicit extensions in metadata
    // (Actual detection will happen during fetch in handleViewImage)
    return { mime: 'image/png', ext: '.png' };
};
