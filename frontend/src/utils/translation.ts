/**
 * =====================================================
 * [AR] مساعد الترجمة الموحد
 * [EN] Unified Translation Helper
 * =====================================================
 */

/**
 * [AR] دالة بسيطة لاستخراج النص بناءً على اللغة
 * [EN] Simple function to extract text based on language
 * 
 * @param obj - [AR] الكائن ثنائي اللغة | [EN] Bilingual object {ar, en}
 * @param isAr - [AR] هل اللغة الحالية عربية؟ | [EN] Is current language Arabic?
 * @returns [AR] النص المختار | [EN] Selected string
 */
export const t = (obj: any, isAr: boolean): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;

    // Support {ar: string, en: string}
    if (obj.ar !== undefined || obj.en !== undefined) {
        return isAr ? (obj.ar || obj.en) : (obj.en || obj.ar);
    }

    // Support snake_case from DB: {app_name_ar, app_name_en} - handled at config level mostly, 
    // but this helper is for UI objects.

    return String(obj);
};
