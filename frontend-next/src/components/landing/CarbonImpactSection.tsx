import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Globe, Zap, Percent, ShieldCheck } from 'lucide-react';
import { performHttpJsonRequest } from '@/api/http';

interface CarbonData {
    url: string;
    green: boolean | string;
    bytes: number;
    cleanerThan: number;
    statistics: {
        adjustedBytes: number;
        energy: number;
        co2: {
            grid: { grams: number; litres: number };
            renewable: { grams: number; litres: number };
        };
    };
    source?: {
        name: string;
        region: string;
        year: number;
        provider: string;
    };
}

interface CarbonImpactSectionProps {
    isAr: boolean;
    config?: {
        badgeAr?: string;
        badgeEn?: string;
        titleAr?: string;
        titleEn?: string;
        descAr?: string;
        descEn?: string;
        footerTitleAr?: string;
        footerTitleEn?: string;
        footerDescAr?: string;
        footerDescEn?: string;
    };
}

const CarbonImpactSection: React.FC<CarbonImpactSectionProps> = ({ isAr, config }) => {
    const [data, setData] = useState<CarbonData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCarbonData = async () => {
            try {
                const currentUrl = window.location.hostname === 'localhost' ? 'gcm-eco.com' : window.location.hostname;
                const { data: result } = await performHttpJsonRequest<any>(`/api/v1/public/carbon-proxy?url=${currentUrl}`);
                if (result && !result.error) {
                    setData(result);
                }
            } catch (error: unknown) {
                // Silently ignore missing API key — carbon widget is optional
                const msg = error instanceof Error ? error.message : String(error);
                if (!msg.includes('not configured') && !msg.includes('404')) {
                    console.error("Failed to fetch carbon data:", error);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCarbonData();
    }, []);

    const stats = [
        {
            icon: Leaf,
            label: isAr ? 'بصمة CO₂' : 'CO₂ Footprint',
            value: data ? `${data.statistics.co2.grid.grams.toFixed(3)}g` : '—',
            sub: isAr ? 'لكل زيارة' : 'per visit',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            icon: Percent,
            label: isAr ? 'مستوى النظافة' : 'Cleanliness',
            value: data ? `${(data.cleanerThan * 100).toFixed(0)}%` : '—',
            sub: isAr ? 'أنظف من غيره' : 'Cleaner than others',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            icon: Zap,
            label: isAr ? 'استهلاك الطاقة' : 'Energy Usage',
            value: data ? `${(data.statistics.energy * 1000).toFixed(3)} mWh` : '—',
            sub: isAr ? 'لكل ضغطة' : 'per interaction',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            icon: ShieldCheck,
            label: isAr ? 'استضافة خضراء' : 'Green Hosting',
            value: data?.green ? (isAr ? 'نعم ✓' : 'Yes ✓') : (isAr ? 'قيد التحقق' : 'Pending'),
            sub: isAr ? 'طاقة متجددة' : 'Renewable Energy',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        }
    ];

    const providerName = data?.source?.provider || 'Climatiq';
    const sourceRegion = data?.source?.region === 'SA' ? (isAr ? 'السعودية' : 'Saudi Arabia') : (data?.source?.region || '');
    const sourceYear = new Date().getFullYear();

    // Use config overrides or fallback to defaults
    const badge = isAr
        ? (config?.badgeAr || 'الاستدامة الرقمية')
        : (config?.badgeEn || 'Digital Sustainability');
    const title = isAr
        ? (config?.titleAr || 'موقعنا صديق للبيئة، حرفياً.')
        : (config?.titleEn || 'A Website That Breathes, Literally.');
    const desc = isAr
        ? (config?.descAr || 'نحن لا ندير البيئة في الواقع فقط، بل نلتزم بأقل بصمة كربونية رقمية ممكنة. يتم قياس أداء هذا الموقع لحظياً عبر معايير منظمة الاستدامة العالمية.')
        : (config?.descEn || 'We don\'t just manage the environment; we lead by example. Our digital platform is optimized for the lowest possible carbon footprint, verified in real-time.');
    const footerTitle = isAr
        ? (config?.footerTitleAr || 'فخورون بكوننا جزءاً من الحل')
        : (config?.footerTitleEn || 'Proud to be part of the solution');
    const footerDesc = isAr
        ? (config?.footerDescAr || 'كل سطر برمجي كتبناه تم تحسينه لتقليل استهلاك الطاقة في خوادمنا. هذا هو التزام GCM تجاه كوكبنا.')
        : (config?.footerDescEn || 'Every line of code is optimized to reduce server energy consumption. This is GCM\'s commitment to our planet.');

    return (
        <section className="relative py-24 overflow-hidden bg-slate-950">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Globe size={14} className="animate-spin-slow" />
                        {badge}
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
                    >
                        {title}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed"
                    >
                        {desc}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative group overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                                <stat.icon size={28} />
                            </div>

                            <h3 className="text-slate-400 text-sm font-semibold mb-2">{stat.label}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white tracking-tight">{loading ? '...' : stat.value}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{stat.sub}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 p-8 rounded-3xl bg-linear-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-start"
                >
                    <div className="flex-1">
                        <h4 className="text-xl font-bold text-white mb-2">{footerTitle}</h4>
                        <p className="text-slate-400 text-sm">{footerDesc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-end">
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">{isAr ? 'تم التحقق بواسطة' : 'Verified By'}</div>
                            <div className="text-lg font-bold text-white tracking-tighter">{providerName}</div>
                            {sourceRegion && <div className="text-[10px] text-slate-500 font-medium">{sourceRegion} {sourceYear ? `(${sourceYear})` : ''}</div>}
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl">
                            <Leaf className="text-emerald-400" size={32} />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CarbonImpactSection;
