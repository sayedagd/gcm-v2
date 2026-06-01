/**
 * =====================================================
 * [AR] مكون حالة الاتصال
 * [EN] Connectivity Badge Component
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../../context';
import { useTranslation } from '../../hooks/useTranslation';

const ConnectivityBadge: React.FC = () => {
    const { saasConfig } = useStore();
    const { t } = useTranslation();
    const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch('/api/config');
                if (res.ok) setStatus('online');
                else setStatus('offline');
            } catch (e) {
                setStatus('offline');
            }
        };
        check();
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    const isAr = saasConfig.language === 'ar';

    if (status === 'online') return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{t('common.online')}</span>
        </div>
    );

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-full animate-pulse">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[9px] font-black uppercase text-rose-600 tracking-widest">{t('common.offline')}</span>
        </div>
    );
};

export default ConnectivityBadge;
