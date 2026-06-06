"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Server, Database, Activity, Users, Cpu, HardDrive, CheckCircle2, Clock, Shield, Globe,
    RefreshCw, Terminal, AlertTriangle, Archive, Upload
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Button } from '@/components';
import { useStore } from '@/context';
import { createApiClient } from '@/api/client';
import { getClientAuthHeaders } from '@/lib/clientAuth';

type SystemMetricsSnapshot = {
    generatedAt: string;
    uptimeSeconds: number;
    thresholds: {
        sseDisconnects15m: number;
        backupFailures24h: number;
    };
    metrics: {
        requestCount15m: number;
        requestErrors15m: number;
        avgLatencyMs15m: number;
        errorRatePercent15m: number;
        authFailures15m: number;
        sseDisconnects15m: number;
        backupFailures24h: number;
    };
    activeAlerts: Array<{ name: string }>;
};

type ServiceStatus = 'online' | 'offline' | 'idle';

type ServiceItem = {
    name: string;
    status: ServiceStatus;
    latency: string;
};

type ServerStatCardProps = {
    title: string;
    value: string;
    subValue: string;
    icon: LucideIcon;
    color: 'blue' | 'emerald' | 'violet' | 'amber';
};

type ResourceBarProps = {
    label: string;
    value: number;
    icon: LucideIcon;
    color: 'blue' | 'purple' | 'orange';
};

const SystemMonitor: React.FC = () => {
    const { saasConfig, users, logs } = useStore();
    const isAr = saasConfig.language === 'ar';

    const api = useMemo(() => createApiClient(saasConfig?.apiConfig?.baseUrl || ''), [saasConfig?.apiConfig?.baseUrl]);
    const [metricsSnapshot, setMetricsSnapshot] = useState<SystemMetricsSnapshot | null>(null);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [backupStatus, setBackupStatus] = useState<{ lastBackupDate: string | null, isMediaIncluded: boolean }>({ lastBackupDate: null, isMediaIncluded: false });
    const [isBackingUpDb, setIsBackingUpDb] = useState(false);
    const [isBackingUpFull, setIsBackingUpFull] = useState(false);
    
    // Restore state
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmText, setConfirmText] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        api.getBackupStatus().then(setBackupStatus).catch(console.error);
    }, [api]);

    useEffect(() => {
        let isMounted = true;

        const pollMetrics = async () => {
            try {
                const data = await api.getSystemMetrics() as SystemMetricsSnapshot;
                if (!isMounted) return;
                setMetricsSnapshot(data);
                setMetricsError(null);
            } catch (error) {
                if (!isMounted) return;
                setMetricsError(error instanceof Error ? error.message : 'Unknown metrics error');
            }
        };

        pollMetrics();
        const intervalId = setInterval(pollMetrics, 30000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [api]);

    const handleBackup = async (format: 'sql' | 'full') => {
        if (format === 'full') setIsBackingUpFull(true);
        else setIsBackingUpDb(true);

        try {
            const url = `${saasConfig?.apiConfig?.baseUrl || ''}/api/system/backup/download?format=${format}`;
            
            const response = await fetch(url, {
                headers: getClientAuthHeaders(),
                credentials: 'include',
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Backup failed or unauthorized');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `GCM_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'full' ? 'zip' : 'sql'}`;
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const filenamePart = contentDisposition.split('filename=')[1];
                if (filenamePart) {
                    filename = filenamePart.replace(/["']/g, '');
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Backup download error:', error);
            alert(isAr ? `حدث خطأ أثناء تحميل النسخة الاحتياطية: ${(error as Error).message}` : `Backup error: ${(error as Error).message}`);
        } finally {
            if (format === 'full') setIsBackingUpFull(false);
            else setIsBackingUpDb(false);
        }
    };

    const isBackupOld = useMemo(() => {
        if (!backupStatus.lastBackupDate) return true;
        const days = (new Date().getTime() - new Date(backupStatus.lastBackupDate).getTime()) / (1000 * 3600 * 24);
        return days > 7;
    }, [backupStatus.lastBackupDate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setIsRestoreModalOpen(true);
        }
        // Reset input so the same file can be selected again if cancelled
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRestoreSubmit = async () => {
        if (!selectedFile) return;
        if (confirmText !== 'RESTORE') {
            alert(isAr ? 'يرجى كتابة RESTORE بشكل صحيح للتأكيد.' : 'Please type RESTORE correctly to confirm.');
            return;
        }

        setIsRestoring(true);
        try {
            await api.restoreBackup(selectedFile);
            alert(isAr ? 'تم استعادة النظام بنجاح! سيتم تحديث الصفحة.' : 'System restored successfully! Page will reload.');
            window.location.reload();
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert((isAr ? 'فشلت عملية الاستعادة: ' : 'Restore failed: ') + message);
            setIsRestoring(false);
        }
    };

    const uptimeLabel = useMemo(() => {
        const total = metricsSnapshot?.uptimeSeconds || 0;
        const days = Math.floor(total / 86400);
        const hours = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    }, [metricsSnapshot?.uptimeSeconds]);

    const services = useMemo<ServiceItem[]>(() => {
        const metrics = metricsSnapshot?.metrics;
        const thresholds = metricsSnapshot?.thresholds;
        if (!metrics || !thresholds) {
            return [
                { name: 'API Server', status: 'idle', latency: '-' },
                { name: 'Auth Service', status: 'idle', latency: '-' },
                { name: 'SSE Stream', status: 'idle', latency: '-' },
                { name: 'Backup Pipeline', status: 'idle', latency: '-' },
                { name: 'Metrics Endpoint', status: metricsError ? 'offline' : 'idle', latency: '-' },
            ];
        }

        return [
            { name: 'API Server', status: metrics.requestErrors15m > 0 ? 'idle' : 'online', latency: `${metrics.avgLatencyMs15m}ms` },
            { name: 'Auth Service', status: metrics.authFailures15m > 0 ? 'idle' : 'online', latency: `${metrics.authFailures15m} fails/15m` },
            {
                name: 'SSE Stream',
                status: metrics.sseDisconnects15m >= thresholds.sseDisconnects15m ? 'offline' : 'online',
                latency: `${metrics.sseDisconnects15m} drops/15m`,
            },
            {
                name: 'Backup Pipeline',
                status: metrics.backupFailures24h >= thresholds.backupFailures24h ? 'offline' : 'online',
                latency: `${metrics.backupFailures24h} fails/24h`,
            },
            { name: 'Metrics Endpoint', status: 'online', latency: `${new Date(metricsSnapshot.generatedAt).toLocaleTimeString()}` },
        ];
    }, [metricsSnapshot, metricsError]);

    const resourceMetrics = useMemo(() => {
        const metrics = metricsSnapshot?.metrics;
        const thresholds = metricsSnapshot?.thresholds;

        const errorRate = Math.max(0, Math.min(100, metrics?.errorRatePercent15m || 0));
        const avgLatency = Math.max(0, Math.min(100, ((metrics?.avgLatencyMs15m || 0) / 1000) * 100));
        const ssePressure = metrics && thresholds
            ? Math.max(0, Math.min(100, (metrics.sseDisconnects15m / Math.max(1, thresholds.sseDisconnects15m)) * 100))
            : 0;

        return { errorRate, avgLatency, ssePressure };
    }, [metricsSnapshot]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-emerald-500 bg-emerald-500/10';
            case 'offline': return 'text-red-500 bg-red-500/10';
            case 'idle': return 'text-amber-500 bg-amber-500/10';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    return (
        <div className="space-y-6">
            {isBackupOld && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-red-500 mt-0.5" size={20} />
                    <div>
                        <h3 className="text-red-500 font-bold">{isAr ? 'تنبيه أمني هام' : 'Critical Security Alert'}</h3>
                        <p className="text-red-400 text-sm mt-1">
                            {isAr 
                                ? 'لم يتم أخذ نسخة احتياطية منذ أكثر من 7 أيام! يرجى أخذ نسخة احتياطية كاملة الآن لضمان أمان البيانات.' 
                                : 'No backup has been taken in over 7 days! Please take a full backup now to ensure data safety.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".sql,.zip" 
                className="hidden" 
            />

            {/* Restore Confirmation Modal */}
            {isRestoreModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface rounded-2xl w-full max-w-md p-6 border border-border shadow-2xl"
                    >
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={32} />
                            <h2 className="text-xl font-black uppercase tracking-widest">{isAr ? 'تحذير مسح البيانات!' : 'Data Wipe Warning!'}</h2>
                        </div>
                        
                        <p className="text-text-main font-medium mb-2">
                            {isAr 
                                ? 'أنت على وشك استعادة النظام من ملف خارجي. هذه العملية ستقوم بمسح قاعدة البيانات الحالية تماماً واستبدالها بالنسخة المرفوعة.'
                                : 'You are about to restore the system. This will WIPE the current database and replace it with the uploaded backup.'}
                        </p>
                        <p className="text-sm text-text-subtle mb-6">
                            {isAr ? `الملف: ${selectedFile?.name}` : `File: ${selectedFile?.name}`}
                        </p>

                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-6">
                            <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-2">
                                {isAr ? 'للتأكيد، اكتب كلمة RESTORE بالأسفل:' : 'To confirm, type RESTORE below:'}
                            </label>
                            <input 
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="RESTORE"
                                className="w-full bg-surface border border-red-500/30 rounded-lg px-4 py-2 text-text-main focus:border-red-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                className="flex-1"
                                onClick={() => {
                                    setIsRestoreModalOpen(false);
                                    setSelectedFile(null);
                                    setConfirmText('');
                                }}
                                disabled={isRestoring}
                            >
                                {isAr ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none"
                                onClick={handleRestoreSubmit}
                                disabled={confirmText !== 'RESTORE' || isRestoring}
                            >
                                {isRestoring 
                                    ? (isAr ? 'جاري الاستعادة...' : 'Restoring...') 
                                    : (isAr ? 'تأكيد ومسح' : 'Confirm & Wipe')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Activity size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-text-main tracking-tight">
                                {isAr ? 'مراقبة النظام' : 'System Monitor'}
                            </h1>
                        </div>
                        <p className="text-sm text-text-subtle mt-0.5">
                            {isAr ? 'لوحة قيادة حية لأداء الخوادم والخدمات' : 'Real-time dashboard for server and service performance'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-surface-subtle px-3 py-1.5 rounded-lg border border-border">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE CONNECTED
                    </div>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ServerStatCard
                    title={isAr ? 'بيئة العمل' : 'Environment'}
                    value="Production"
                    icon={Globe}
                    color="blue"
                    subValue="v2.4.0-stable"
                />
                <ServerStatCard
                    title={isAr ? 'وقت التشغيل' : 'System Uptime'}
                    value={uptimeLabel}
                    icon={Clock}
                    color="emerald"
                    subValue={metricsSnapshot ? 'Live metrics' : 'Awaiting metrics'}
                />
                <ServerStatCard
                    title={isAr ? 'المستخدمين النشطين' : 'Active Users'}
                    value={users.length.toString()}
                    icon={Users}
                    color="violet"
                    subValue={`Total: ${users.length}`}
                />
                <ServerStatCard
                    title={isAr ? 'حالة الأمان' : 'Security Status'}
                    value={(metricsSnapshot?.activeAlerts?.length || 0) > 0 ? 'Alerted' : 'Secure'}
                    icon={Shield}
                    color={(metricsSnapshot?.activeAlerts?.length || 0) > 0 ? 'amber' : 'emerald'}
                    subValue={(metricsSnapshot?.activeAlerts?.length || 0) > 0 ? `${metricsSnapshot?.activeAlerts?.length || 0} active alerts` : 'No active alerts'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resources Layout */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Server Resources */}
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Server size={18} /> {isAr ? 'موارد الخادم' : 'Server Resources'}
                        </h3>

                        <div className="space-y-6">
                            <ResourceBar
                                label="Request Error Rate (15m)"
                                value={resourceMetrics.errorRate}
                                icon={Cpu}
                                color="blue"
                            />
                            <ResourceBar
                                label="Average Latency (15m)"
                                value={resourceMetrics.avgLatency}
                                icon={Activity}
                                color="purple"
                            />
                            <ResourceBar
                                label="SSE Disconnect Pressure"
                                value={resourceMetrics.ssePressure}
                                icon={HardDrive}
                                color="orange"
                            />
                        </div>
                    </Card>

                    {/* Service Health */}
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
                            <CheckCircle2 size={18} /> {isAr ? 'حالة الخدمات' : 'Service Health'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {services.map((svc) => (
                                <div key={svc.name} className="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${getStatusColor(svc.status)}`}>
                                            <Server size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-main">{svc.name}</p>
                                            <p className="text-[10px] text-text-subtle uppercase">{svc.status}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-primary">{svc.latency}</span>
                                </div>
                            ))}
                            {metricsError && (
                                <div className="sm:col-span-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-medium">
                                    {isAr ? 'تعذر جلب قياسات النظام الحية.' : 'Unable to fetch live system metrics.'}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar: Logs & Database */}
                <div className="space-y-6">
                    {/* Database Info */}
                    <Card className="p-6 bg-slate-900 text-white border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <Database size={18} className="text-emerald-400" /> Database
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold uppercase">Connected</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                                <span className="text-slate-400">Type</span>
                                <span className="font-mono text-emerald-400">PostgreSQL 14</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                                <span className="text-slate-400">Size</span>
                                <span className="font-mono text-white">1.2 GB</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                                <span className="text-slate-400">Connections</span>
                                <span className="font-mono text-white">42 / 100</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-slate-400">Last Backup</span>
                                <span className={`font-mono ${isBackupOld ? 'text-red-400 font-bold' : 'text-white'}`}>
                                    {backupStatus.lastBackupDate 
                                        ? new Date(backupStatus.lastBackupDate).toLocaleDateString() 
                                        : 'Never'}
                                </span>
                            </div>
                            {backupStatus.isMediaIncluded && (
                                <div className="flex justify-between items-center text-xs mt-1">
                                    <span className="text-slate-500">Includes Media</span>
                                    <span className="text-emerald-500">Yes</span>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                                    onClick={() => handleBackup('sql')}
                                    disabled={isBackingUpDb}
                                >
                                    <Database size={16} className="mr-2" />
                                    {isAr ? 'نسخ قاعدة البيانات فقط' : 'Backup DB Only'}
                                </Button>
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white"
                                    onClick={() => handleBackup('full')}
                                    disabled={isBackingUpFull || isRestoring}
                                >
                                    <Archive size={16} className="mr-2" />
                                    {isBackingUpFull ? (isAr ? 'جاري ضغط الملفات...' : 'Zipping...') : (isAr ? 'نسخ شامل (بيانات + ميديا)' : 'Full Backup (DB + Media)')}
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="w-full justify-center bg-slate-800 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 mt-2"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isBackingUpDb || isBackingUpFull || isRestoring}
                                >
                                    <Upload size={16} className="mr-2" />
                                    {isAr ? 'استعادة نسخة احتياطية (Import)' : 'Restore Backup (Import)'}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Recent System Logs */}
                    <Card className="p-0 overflow-hidden flex flex-col h-[400px]">
                        <div className="p-4 border-b border-border bg-surface-subtle flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Terminal size={14} /> {isAr ? 'سجل النظام' : 'System Logs'}
                            </h3>
                            <RefreshCw size={12} className="text-text-subtle hover:text-primary cursor-pointer" />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {logs.slice(0, 10).map((log) => (
                                <div key={log.id} className="p-3 border-b border-border hover:bg-surface-subtle/50 transition-colors text-xs font-mono">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-primary-600 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold
                         ${log.action.includes('DELETE') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {log.action.split('_')[0]}
                                        </span>
                                    </div>
                                    <p className="text-text-main truncate">{log.details}</p>
                                    <p className="text-text-subtle text-[10px] mt-0.5">{users.find(u => u.id === log.user_id)?.name || 'Unknown User'}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const ServerStatCard = ({ title, value, subValue, icon: Icon, color }: ServerStatCardProps) => {
    const colorClasses: Record<ServerStatCardProps['color'], string> = {
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };

    return (
        <Card className="p-5 flex items-start justify-between group hover:border-primary/30 transition-all">
            <div>
                <h4 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{title}</h4>
                <div className="text-2xl font-black text-text-main mb-1">{value}</div>
                <div className="text-[10px] font-medium text-text-subtle opacity-70">{subValue}</div>
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue} group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
        </Card>
    );
};

const ResourceBar = ({ label, value, icon: Icon, color }: ResourceBarProps) => {
    const colorClasses: Record<ResourceBarProps['color'], string> = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
    };

    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-text-subtle" />
                    <span className="text-xs font-bold text-text-main uppercase">{label}</span>
                </div>
                <span className="text-sm font-bold font-mono text-text-main">{value.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${colorClasses[color] || 'bg-primary'}`}
                />
            </div>
        </div>
    );
};

export default SystemMonitor;
