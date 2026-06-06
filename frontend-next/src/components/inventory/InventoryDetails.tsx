"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import {
    Container as SkipIcon, Droplet, Scale, Activity, MapPin, Shield,
    Globe, Edit2, DownloadCloud, Calendar, Wrench, Building2, TrendingUp, CheckCircle2
} from 'lucide-react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import { InventorySize, Project, Trip } from '@/types';
import { printInventoryDossier } from '@/utils/exportHelpers';
import { useStore } from '@/context';

const AssetMap = dynamic(() => import('./AssetMap'), {
    ssr: false,
});

const { useMemo } = React;

interface InventoryDetailsProps {
    item: any;
    activeTab: 'containers' | 'tanks' | 'scales' | 'sizes';
    isAr: boolean;
    inventorySizes: InventorySize[];
    projects: Project[];
    stats: {
        tripsCount: number;
        lastTrip: Trip | null;
        history: Trip[];
    };
    onEdit: () => void;
    companies: any[];
}

const InventoryDetails: React.FC<InventoryDetailsProps> = ({
    item,
    activeTab,
    isAr,
    inventorySizes,
    projects,
    stats,
    onEdit,
    companies
}) => {
    const { saasConfig, services, assetServiceLinks } = useStore();
    if (!item) return null;

    const id = item.container_id || item.tank_id || item.scale_id || item.size_id;
    const assetType = activeTab === 'containers' ? 'CONTAINER' : activeTab === 'tanks' ? 'TANK' : 'SCALE';
    const linkedLinks = assetServiceLinks.filter(l => l.asset_type === assetType && l.asset_id === id);
    const primaryService = services.find(s => s.service_id === linkedLinks[0]?.service_id);
    const itemWithService = { ...item, primaryServiceName: primaryService?.service_name || '' };

    const sizeName = inventorySizes.find(s => s.size_id === item.size_id)?.name || 'GENERIC UNIT';

    // [AR] معالجة سجلات الصيانة بأمان - [EN] Safely parse maintenance logs
    const logs = useMemo(() => {
        try {
            if (!item.maintenance_logs) return [];
            return typeof item.maintenance_logs === 'string' ? JSON.parse(item.maintenance_logs) : item.maintenance_logs;
        } catch (e) {
            console.error('[Logs Parse Error]', e);
            return [];
        }
    }, [item.maintenance_logs]);

    const lastLocation = stats.lastTrip
        ? (projects.find(p => p.project_id === stats.lastTrip?.project_id)?.project_name || 'N/A')
        : 'STANDBY';

    // Deployment History
    const deploymentHistory = useMemo(() => {
        return stats.history.map(trip => {
            const project = projects.find(p => p.project_id === trip.project_id);
            const company = companies.find(c => c.company_id === project?.company_id);
            return {
                ...trip,
                projectName: project?.project_name || 'Unknown Project',
                companyName: company?.company_name || 'N/A'
            };
        });
    }, [stats.history, projects]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Asset Identity Header - Intelligence Hub Edition */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-surface-subtle rounded-[2rem] border border-border relative overflow-hidden group">
                {/* Status LED Glow Background */}
                <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 transition-colors ${item.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-600'}`} />

                <div className="flex items-center gap-6 relative z-10">
                    <div className={`p-6 rounded-2xl shadow-2xl transition-all duration-500 group-hover:scale-105 ${item.status === 'AVAILABLE' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'} text-white`}>
                        {activeTab === 'containers' ? <SkipIcon size={44} /> : activeTab === 'tanks' ? <Droplet size={44} /> : <Scale size={44} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em]">{item.code}</span>
                            <div className="h-1 w-1 rounded-full bg-text-subtle/30" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{activeTab}</span>
                        </div>
                        <h2 className="text-4xl font-extrabold text-text-main tracking-tight uppercase leading-tight">{sizeName}</h2>

                        <div className="flex flex-wrap gap-2 mt-4">
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                <div className={`h-2 w-2 rounded-full animate-pulse ${item.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                {item.status}
                            </div>
                            <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-text-subtle">
                                {isAr ? 'الملكية:' : 'Owner:'} {item.ownership}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 relative z-10">
                    <Button
                        variant="secondary"
                        icon={DownloadCloud}
                        onClick={() => printInventoryDossier(itemWithService, activeTab, stats, isAr, inventorySizes, projects, companies, saasConfig?.templateConfig)}
                        className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs"
                    >
                        {isAr ? 'تصدير التقارير' : 'PRINT'}
                    </Button>
                    <Button
                        variant="primary"
                        icon={Edit2}
                        onClick={onEdit}
                        className="h-14 px-8 rounded-2xl font-bold tracking-widest text-xs"
                    >
                        {isAr ? 'تحديث' : 'MANAGE'}
                    </Button>
                </div>
            </div>

            {/* Smarter Intelligence KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title={isAr ? 'الموقع الحالي (التعميد)' : 'Assigned Project'}
                    value={item.project_id ? (projects.find(p => p.project_id === item.project_id)?.project_name || 'SITE-ACTIVE') : (isAr ? 'في الانتظار' : 'STANDBY')}
                    icon={Building2}
                    variant="emerald"
                />
                <StatCard
                    title={isAr ? 'آخر موقع (الرحلات)' : 'Last Trip Site'}
                    value={lastLocation}
                    icon={MapPin}
                    variant="blue"
                />
                <StatCard
                    title={isAr ? 'إجمالي الاستخدام' : 'Total Trips'}
                    value={stats.tripsCount}
                    icon={Activity}
                    variant="blue"
                />
            </div>

            {/* Technical Specifications */}
            <Card className="p-8 space-y-6">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                    <Shield size={16} /> {isAr ? 'المواصفات الفنية والملكية' : 'Technical Specs'}
                </h4>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <span className="text-[10px] block font-bold text-text-subtle opacity-60 uppercase mb-2 ml-1">{isAr ? 'الكود المرجعي' : 'Serial ID'}</span>
                        <div className="p-4 bg-surface-subtle rounded-2xl font-bold text-text-main border border-border">{item.code}</div>
                    </div>
                    <div>
                        <span className="text-[10px] block font-bold text-text-subtle opacity-60 uppercase mb-2 ml-1">{isAr ? 'الحالة التشغيلية' : 'Status'}</span>
                        <div className="p-4 bg-surface-subtle rounded-2xl font-bold text-text-main border border-border uppercase">{item.status}</div>
                    </div>
                    <div>
                        <span className="text-[10px] block font-bold text-text-subtle opacity-60 uppercase mb-2 ml-1">{isAr ? 'جهة الملكية' : 'Owner'}</span>
                        <div className="p-4 bg-surface-subtle rounded-2xl font-bold text-text-main border border-border uppercase">{item.ownership} {item.supplier_name && `(${item.supplier_name})`}</div>
                    </div>
                    <div>
                        <span className="text-[10px] block font-bold text-text-subtle opacity-60 uppercase mb-2 ml-1">{isAr ? 'تاريخ الشراء' : 'Purchase Date'}</span>
                        <div className="p-4 bg-surface-subtle rounded-2xl font-bold text-text-main border border-border uppercase">{item.purchase_date || '-- / -- / ----'}</div>
                    </div>
                </div>

                {/* Maintenance & Reliability History */}
                <div className="pt-8 space-y-6 border-t border-border">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                            <Wrench size={16} /> {isAr ? 'سجل عمليات الصيانة والاعتمادية' : 'Reliability Ledger'}
                        </h4>
                        {logs.length > 0 && (
                            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase rounded-full border border-emerald-500/20">
                                {logs.length} {isAr ? 'عمليات' : 'LOGS'}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {logs.length > 0 ? (
                            logs.map((log: any, idx: number) => (
                                <div key={idx} className="flex items-start justify-between p-5 bg-surface rounded-2xl border border-border group hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-12">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-subtle uppercase mb-1 tracking-tighter opacity-60">{log.date}</p>
                                            <p className="text-xs font-bold text-text-main line-clamp-2">{log.notes}</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-1" />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full p-10 bg-surface rounded-3xl border border-dashed border-border text-center group hover:border-primary/30 transition-colors">
                                <div className="p-4 bg-surface-subtle rounded-2xl inline-block mb-4 text-text-subtle/30 group-hover:text-primary/40 transition-colors">
                                    <Shield size={32} />
                                </div>
                                <p className="text-xs font-bold text-text-subtle opacity-50 uppercase tracking-[0.2em]">{isAr ? 'لا توجد سجلات صيانة حالياً' : 'No maintenance cycles recorded'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Deployment Intel Timeline */}
                <div className="pt-8 space-y-6 border-t border-border">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-text-subtle">
                        <Globe size={16} /> {isAr ? 'خريطة الانتشار والعمليات' : 'Operational Deployment Map'}
                    </h4>

                    <div className="space-y-6">
                        {/* Interactive Asset Map */}
                        {stats.history.length > 0 && (
                            <AssetMap history={stats.history} isAr={isAr} />
                        )}

                        {deploymentHistory.length > 0 ? (
                            <div className="relative pl-8 border-l-2 border-border space-y-8 py-4">
                                {deploymentHistory.slice(0, 5).map((move, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[41px] top-0 p-1.5 bg-surface border-2 border-border rounded-full group">
                                            <div className="h-4 w-4 rounded-full bg-primary" />
                                        </div>
                                        <div className="bg-surface p-5 rounded-2xl border border-border hover:border-primary/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="text-sm font-bold text-text-main">{move.projectName}</h5>
                                                <span className="text-[10px] font-bold text-text-subtle uppercase">{move.date}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-text-subtle">
                                                    <Building2 size={12} /> {move.companyName}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                                                    <TrendingUp size={12} /> {move.quantity} {move.unit}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 bg-surface rounded-3xl border border-dashed border-border text-center">
                                <p className="text-xs font-bold text-text-subtle opacity-50 uppercase tracking-widest">{isAr ? 'لم يسبق نشر هذا الأصل في المواقع' : 'Asset has no recorded field deployments'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Document & Report Generator Section */}
                <div className="pt-4 border-t border-border">
                    <Button
                        variant="secondary"
                        className="w-full flex items-center justify-between p-6 rounded-2xl bg-blue-600/5 border border-blue-500/20 group hover:bg-blue-600 transition-all"
                        onClick={() => printInventoryDossier(itemWithService, activeTab, stats, isAr, inventorySizes, projects, companies, saasConfig?.templateConfig)}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                <DownloadCloud size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest group-hover:text-white/70">{isAr ? 'التقرير الفني الشامل' : 'Technical Dossier'}</p>
                                <p className="text-xs font-bold text-text-main group-hover:text-white">{isAr ? 'توليد ملف PDF جاهز للطباعة — بكل البيانات' : 'Full PDF Report — All Data Included'}</p>
                            </div>
                        </div>
                    </Button>
                </div>
            </Card>

        </div>
    );
};

export default InventoryDetails;
