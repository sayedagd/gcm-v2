import React, { useMemo, useState, useCallback } from 'react';
import { useStore } from '@/context';
import { StatCard, Card, Badge, Button } from '@/components';
import {
    Truck, Box, Users, MapPin,
    Activity, ShieldCheck, Clock, BarChart3,
    CheckCircle2, TrendingUp, Zap, Target,
    FileText, Shield, HardHat, AlertCircle, Wrench, RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';
import { subDays, format, isAfter, addDays } from 'date-fns';
import { useLookupMaps } from '@/hooks/useLookupMaps';

const SubcontractorDashboard: React.FC = () => {
    const {
        currentUser, saasConfig, vehicles, suppliers,
        drivers, containers, tanks, trips, projects, loadAllData
    } = useStore();
    const navigate = useNavigate();
    const isAr = saasConfig.language === 'ar';
    const { supplierMap } = useLookupMaps();

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try { await loadAllData(); } finally { setIsRefreshing(false); }
    }, [loadAllData]);

    const mySupplier = useMemo(() =>
        currentUser.supplier_id ? supplierMap[currentUser.supplier_id] || null : null,
        [supplierMap, currentUser.supplier_id]);

    // Data Filtering
    const myVehicles = useMemo(() =>
        (vehicles || []).filter(v => v.supplier_id === mySupplier?.supplier_id || v.supplier_name === mySupplier?.name),
        [vehicles, mySupplier]);

    const myDrivers = useMemo(() =>
        (drivers || []).filter(d => d.supplier_id === mySupplier?.supplier_id || d.supplier_name === mySupplier?.name),
        [drivers, mySupplier]);

    const myContainers = useMemo(() =>
        (containers || []).filter(c => c.supplier_id === mySupplier?.supplier_id),
        [containers, mySupplier]);

    const myTanks = useMemo(() =>
        (tanks || []).filter(t => t.supplier_id === mySupplier?.supplier_id),
        [tanks, mySupplier]);

    const myVehicleIds = useMemo(() =>
        myVehicles.map(v => v.vehicle_id),
        [myVehicles]);

    const myTrips = useMemo(() =>
        (trips || []).filter(t => myVehicleIds.includes(t.vehicle_id)),
        [trips, myVehicleIds]);

    const myProjectIds = useMemo(() =>
        Array.from(new Set(myTrips.map(t => t.project_id))),
        [myTrips]);

    const myProjectsList = useMemo(() =>
        (projects || []).filter(p => myProjectIds.includes(p.project_id)),
        [projects, myProjectIds]);

    // Advanced Metrics
    const activeFleetCount = myVehicles.filter(v => v.status === 'ACTIVE').length;
    
    const complianceScore = useMemo(() => {
        if (myDrivers.length === 0) return 100;
        const totalDocs = myDrivers.length * 4;
        let completedDocs = 0;
        myDrivers.forEach(d => {
            if (d.iqama_no) completedDocs++;
            if (d.license_no) completedDocs++;
            if (d.operating_card_no) completedDocs++;
            if (d.insurance_no) completedDocs++;
        });
        return Math.round((completedDocs / totalDocs) * 100);
    }, [myDrivers]);

    // 4. Critical Operational Alerts
    const operationalAlerts = useMemo(() => {
        const alerts = [];
        
        // Document Expiry Alerts
        myDrivers.forEach(d => {
            const docs = [
                { name: isAr ? 'الإقامة' : 'Iqama', val: d.iqama_no },
                { name: isAr ? 'الرخصة' : 'License', val: d.license_no },
                { name: isAr ? 'كرت التشغيل' : 'Operating Card', val: d.operating_card_no },
                { name: isAr ? 'التأمين' : 'Insurance', val: d.insurance_no }
            ];
            const missing = docs.filter(doc => !doc.val).length;
            if (missing > 0) {
                alerts.push({
                    id: `doc-${d.driver_id}`,
                    type: 'WARNING',
                    title: d.name,
                    message: isAr ? `نقص في ${missing} وثائق أساسية` : `Missing ${missing} critical documents`,
                    icon: Shield
                });
            }
        });

        // Vehicle Status Alerts
        const unitsInMaintenance = myVehicles.filter(v => v.status === 'MAINTENANCE').length;
        if (unitsInMaintenance > 0) {
            alerts.push({
                id: 'maint-fleet',
                type: 'INFO',
                title: isAr ? 'صيانة الأسطول' : 'Fleet Maintenance',
                message: isAr ? `يوجد ${unitsInMaintenance} مركبات قيد الصيانة` : `${unitsInMaintenance} units currently in maintenance`,
                icon: Wrench
            });
        }

        return alerts;
    }, [myDrivers, myVehicles, isAr]);

    // 5. Site-Based Deployment Map
    const siteDeployments = useMemo(() => {
        return myProjectsList.map(project => {
            const projectTrips = myTrips.filter(t => t.project_id === project.project_id);
            const projectVehicles = Array.from(new Set(projectTrips.map(t => t.vehicle_id)));
            const projectDrivers = Array.from(new Set(projectTrips.map(t => t.driver_id)));
            
            return {
                ...project,
                activeUnits: projectVehicles.length,
                activePersonnel: projectDrivers.length,
                tripsToday: projectTrips.filter(t => t.date === format(new Date(), 'yyyy-MM-dd')).length
            };
        });
    }, [myProjectsList, myTrips]);

    // 6. Utilization Metrics
    const utilizationRate = myVehicles.length > 0 ? Math.round((activeFleetCount / myVehicles.length) * 100) : 0;

    const chartData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = subDays(new Date(), i);
            return format(d, 'yyyy-MM-dd');
        }).reverse();

        return last7Days.map(date => ({
            date: date,
            trips: myTrips.filter(t => t.date === date).length,
            label: format(new Date(date), 'MMM dd')
        }));
    }, [myTrips]);

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
            {/* Super Header Section */}
            <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary-500/10 transition-all duration-1000" />

                {/* Intelligent Operational Alerts */}
                {operationalAlerts.length > 0 && (
                    <div className="mb-10 flex flex-wrap gap-4 relative z-20">
                        {operationalAlerts.slice(0, 3).map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-md ${alert.type === 'WARNING' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'}`}
                            >
                                <alert.icon size={18} className="animate-pulse" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{alert.title}</span>
                                    <span className="text-xs font-bold leading-none">{alert.message}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-primary-600 text-white flex items-center justify-center shadow-2xl shadow-primary-600/30 border-4 border-surface group-hover:rotate-6 transition-transform duration-500">
                            <Zap size={48} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="primary" className="px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.3em] rounded-full">
                                    {mySupplier?.name || 'LOGISTICS PARTNER'}
                                </Badge>
                                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                <span className="text-xs font-bold text-text-subtle uppercase tracking-widest opacity-60">
                                    {mySupplier?.category || 'General Services'}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-text-main tracking-tighter uppercase leading-tight mb-2">
                                {isAr ? `قاعدة القيادة: ${currentUser.name}` : `Command Center: ${currentUser.name}`}
                            </h1>
                            <p className="text-sm font-bold text-text-subtle uppercase tracking-[0.2em] max-w-xl">
                                {isAr ? 'إدارة القوة التشغيلية المخصصة والمعدات الميدانية' : 'Orchestrating assigned operational strength and field equipment deployments.'}
                            </p>
                            <button onClick={handleRefresh} disabled={isRefreshing}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-all disabled:opacity-50"
                            >
                                <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                                {isAr ? 'تحديث البيانات' : 'Sync Data'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="px-8 py-5 bg-surface-subtle rounded-3xl border border-border flex flex-col items-center justify-center min-w-[140px]">
                            <span className="text-[10px] font-black text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'الجاهزية' : 'READINESS'}</span>
                            <span className="text-3xl font-black text-emerald-500">{complianceScore}%</span>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/subcontractor/assets')}
                            className="px-10 h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20"
                            icon={TrendingUp}
                        >
                            {isAr ? 'تحليلات الأصول' : 'ASSET INTELLIGENCE'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Global Force Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <StatCard
                        title={isAr ? 'القوة الضاربة للأسطول' : 'Total Fleet Strength'}
                        value={myVehicles.length}
                        icon={Truck}
                        variant="blue"
                        className="bg-blue-500/5 border-blue-500/10 backdrop-blur-xl hover:bg-blue-500/10 transition-all border-b-4 border-b-blue-500/30"
                        description={isAr ? `${activeFleetCount} مركبة نشطة` : `${activeFleetCount} active units`}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <StatCard
                        title={isAr ? 'حاويات ومعدات' : 'Field Equipment'}
                        value={myContainers.length + myTanks.length}
                        icon={Box}
                        variant="emerald"
                        className="bg-emerald-500/5 border-emerald-500/10 backdrop-blur-xl hover:bg-emerald-500/10 transition-all border-b-4 border-b-emerald-500/30"
                        description={isAr ? `${myContainers.length} حاوية / ${myTanks.length} صهريج` : `${myContainers.length} Bins / ${myTanks.length} Tanks`}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <StatCard
                        title={isAr ? 'الكتيبة البشرية' : 'Operational Team'}
                        value={myDrivers.length}
                        icon={Users}
                        variant="purple"
                        className="bg-purple-500/5 border-purple-500/10 backdrop-blur-xl hover:bg-purple-500/10 transition-all border-b-4 border-b-purple-500/30"
                        description={isAr ? 'سائقين ومشغلين ميدانيين' : 'Field operators & drivers'}
                    />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <StatCard
                        title={isAr ? 'كفاءة الامتثال' : 'Compliance Score'}
                        value={`${complianceScore}%`}
                        icon={ShieldCheck}
                        variant="rose"
                        className="bg-rose-500/5 border-rose-500/10 backdrop-blur-xl hover:bg-rose-500/10 transition-all border-b-4 border-b-rose-500/30"
                        description={isAr ? 'اكتمال الوثائق القانونية' : 'Legal documentation registry'}
                    />
                </motion.div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Center Core: Performance & Assets */}
                <div className="xl:col-span-2 space-y-10">
                    {/* Performance Analytics */}
                    <Card className="p-10 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter flex items-center gap-4">
                                    <BarChart3 className="text-primary" size={28} />
                                    {isAr ? 'تحليل النبض التشغيلي' : 'Operational Velocity Analytics'}
                                </h2>
                                <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.3em] mt-1">{isAr ? 'معدل الرحلات والنشاط الميداني' : 'Dispatch rate and site activity trends'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl">
                                    <TrendingUp size={14} className="text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">+14%</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="99%" height={300}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                    <YAxis hide />
                                    <ReTooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: '16px' }}
                                        itemStyle={{ color: '#3b82f6', fontWeight: '900', fontSize: '14px' }}
                                    />
                                    <Area type="monotone" dataKey="trips" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrips)" strokeWidth={4} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Fleet Health & Equipment Radar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-text-main uppercase tracking-tighter flex items-center gap-3 px-2">
                                <Activity className="text-amber-500" size={24} />
                                {isAr ? 'رادار حالة الأسطول' : 'Fleet Health Radar'}
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                {myVehicles.slice(0, 3).map((vehicle) => (
                                    <div key={vehicle.vehicle_id} className="bg-surface p-6 rounded-[2rem] border border-border hover:shadow-xl transition-all group border-l-4 border-l-primary/30">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center text-text-subtle group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-text-main leading-none mb-1">{vehicle.plate_no}</h4>
                                                    <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{vehicle.vehicle_type}</p>
                                                </div>
                                            </div>
                                            <Badge variant={vehicle.status === 'ACTIVE' ? 'emerald' : 'amber'} className="text-[8px] font-black uppercase tracking-widest">
                                                {vehicle.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-text-subtle mt-4">
                                            <div className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-primary" /> {vehicle.permit_count} Permits</div>
                                            <div className="flex items-center gap-1.5"><Clock size={12} /> Live Scan</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-text-main uppercase tracking-tighter flex items-center gap-3 px-2">
                                <Box className="text-emerald-500" size={24} />
                                {isAr ? 'الأصول والمعدات الحالية' : 'Live Asset Registry'}
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                {[...myContainers, ...myTanks].slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="bg-surface p-6 rounded-[2rem] border border-border hover:shadow-xl transition-all border-l-4 border-l-emerald-500/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-text-subtle uppercase tracking-widest opacity-60">#{item.code}</span>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[8px] border-none">{item.status}</Badge>
                                        </div>
                                        <h4 className="text-lg font-black text-text-main mb-3 uppercase tracking-tight">{item.size_id || 'GENERAL UNIT'}</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-subtle uppercase"><MapPin size={10} className="text-rose-500" /> Site assigned</div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-subtle uppercase"><Activity size={10} className="text-emerald-500" /> Operational</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Team Compliance Hub */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-text-main uppercase tracking-tighter flex items-center gap-4">
                                <Users className="text-purple-500" size={28} />
                                {isAr ? 'إدارة الامتثال للفريق' : 'Operational Team Compliance'}
                            </h2>
                            <Badge variant="purple" className="px-3 py-1 text-[10px] font-black">{myDrivers.length} PERSONNEL</Badge>
                        </div>

                        <div className="bg-surface rounded-[2.5rem] border border-border overflow-hidden shadow-2xl">
                            <table className="w-full text-left rtl:text-right">
                                <thead className="bg-surface-subtle">
                                    <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-text-subtle border-b border-border">
                                        <th className="px-8 py-6">{isAr ? 'الموظف' : 'Staff Member'}</th>
                                        <th className="px-8 py-6">{isAr ? 'سجل الوثائق' : 'Document Registry'}</th>
                                        <th className="px-8 py-6">{isAr ? 'الحالة التشغيلية' : 'Operational Status'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {myDrivers.slice(0, 5).map((driver) => (
                                        <tr key={driver.driver_id} className="hover:bg-surface-subtle/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center text-text-subtle font-black text-sm uppercase group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                        {driver.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-text-main leading-none mb-1">{driver.name}</p>
                                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{driver.role_title || 'Operator'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${driver.iqama_no ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`} title="Iqama"><Shield size={14} /></div>
                                                    <div className={`p-2 rounded-lg ${driver.license_no ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`} title="License"><HardHat size={14} /></div>
                                                    <div className={`p-2 rounded-lg ${driver.operating_card_no ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`} title="Operating Card"><FileText size={14} /></div>
                                                    <div className={`p-2 rounded-lg ${driver.insurance_no ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`} title="Insurance"><ShieldCheck size={14} /></div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${driver.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{driver.status}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Strategic Intelligence */}
                <div className="space-y-8">
                    {/* Active Sites Monitor */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-text-main uppercase tracking-tighter flex items-center gap-3 px-2">
                            <Target className="text-rose-500" size={24} />
                            {isAr ? 'مواقع الانتشار النشطة' : 'Deployment Monitor'}
                        </h2>

                        <div className="space-y-4">
                            {siteDeployments.length > 0 ? siteDeployments.map((project) => (
                                <Card key={project.project_id} className="p-8 rounded-[2.5rem] hover:border-rose-500/40 transition-all border-l-8 border-l-rose-500 shadow-xl group bg-surface/40 backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="font-black text-text-main text-lg tracking-tight uppercase leading-none">{project.project_name}</h4>
                                        <Badge variant="rose" className="px-3 py-1 text-[8px] font-black">{project.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-surface-subtle/50 rounded-2xl border border-border">
                                            <p className="text-[8px] font-black text-text-subtle uppercase tracking-[0.2em] mb-1">{isAr ? 'مركبات نشطة' : 'Active Units'}</p>
                                            <p className="text-xl font-black text-text-main">{project.activeUnits}</p>
                                        </div>
                                        <div className="p-4 bg-surface-subtle/50 rounded-2xl border border-border">
                                            <p className="text-[8px] font-black text-text-subtle uppercase tracking-[0.2em] mb-1">{isAr ? 'فريق العمل' : 'Personnel'}</p>
                                            <p className="text-xl font-black text-text-main">{project.activePersonnel}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest leading-none">
                                                {isAr ? 'كفاءة التشغيل' : 'Operational Load'}
                                            </div>
                                            <div className="text-xl font-black text-text-main leading-none">
                                                {project.tripsToday} {isAr ? 'رحلة اليوم' : 'Trips Today'}
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((project.tripsToday / 5) * 100, 100)}%` }}
                                                className="h-full bg-rose-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            )) : (
                                <div className="p-16 text-center bg-surface-subtle rounded-[3rem] border-2 border-dashed border-border group">
                                    <MapPin size={48} className="mx-auto mb-4 opacity-10 group-hover:scale-110 transition-transform" />
                                    <p className="text-xs font-bold text-text-subtle uppercase tracking-[0.2em]">
                                        {isAr ? 'لا توجد مواقع نشطة حالياً' : 'Zero Active Deployments'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operational Summary - Dark High Contrast */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-slate-900 p-10 rounded-[4rem] text-white overflow-hidden relative group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full" />

                        <div className="relative z-10 space-y-12">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-3">{isAr ? 'ملخص العمليات الشهري' : 'OPERATIONAL VELOCITY'}</p>
                                    <div className="flex items-end gap-8">
                                        <h2 className="text-8xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">{myTrips.length}</h2>
                                        <div className="pb-3">
                                            <div className="flex items-center gap-2 text-emerald-400 font-black text-lg">
                                                <TrendingUp size={20} /> +12%
                                            </div>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{isAr ? 'نمو مقارنة بالشهر السابق' : 'Growth from LY'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center bg-white/5 backdrop-blur-md">
                                    <Activity className="text-primary-400" size={32} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all group/stat">
                                    <CheckCircle2 className="text-emerald-500 mb-4 group-hover/stat:scale-110 transition-transform" size={28} />
                                    <h3 className="text-3xl font-black mb-1">{myTrips.filter(t => t.status === 'COMPLETED').length}</h3>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'رحلات مكتملة' : 'SUCCESSFUL'}</p>
                                </div>
                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all group/stat">
                                    <Clock className="text-amber-500 mb-4 group-hover/stat:scale-110 transition-transform" size={28} />
                                    <h3 className="text-3xl font-black mb-1">{myTrips.filter(t => ['PENDING_REVIEW', 'IN_TRANSIT'].includes(t.status)).length}</h3>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isAr ? 'قيد المعالجة' : 'IN PROGRESS'}</p>
                                </div>
                            </div>

                            {/* Alert Section */}
                            {complianceScore < 80 && (
                                <div className="p-5 bg-rose-500/20 rounded-2xl border border-rose-500/30 flex items-center gap-4 animate-pulse">
                                    <AlertCircle className="text-rose-500 shrink-0" size={24} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-100">
                                        {isAr ? 'تنبيه: امتثال الفريق منخفض. يرجى تحديث الوثائق.' : 'Strategy Warning: Sub-optimal compliance detected. Resolve documentation gaps immediately.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SubcontractorDashboard;
