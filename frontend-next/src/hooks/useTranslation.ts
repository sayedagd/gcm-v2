import { useStore } from '@/context';
import { clientTranslations } from '@/constants/translations';

/**
 * [AR] خطاف مخصص للترجمة يعتمد على إعدادات اللغة في النظام
 * [EN] Custom hook for translation based on system language settings
 */
export const useTranslation = () => {
    const { saasConfig } = useStore();
    const lang = saasConfig.language === 'ar' ? 'ar' : 'en';

    const t = (path: string) => {
        const keys = path.split('.');
        let result: any = clientTranslations[lang];

        for (const key of keys) {
            if (result && result[key]) {
                result = result[key];
            } else {
                return path; // Fallback to path string if not found
            }
        }

        return result;
    };

    return { t, isAr: lang === 'ar', lang };
};
