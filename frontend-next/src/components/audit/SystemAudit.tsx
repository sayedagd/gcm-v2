import React, { useState, useEffect } from 'react';
import { useStore } from '@/context';
import { detectDuplicateTrips, DuplicateGroup } from '@/utils/auditHelpers';
import { ShieldAlert, CheckCircle2, AlertTriangle, Clock, MapPin, Truck, User, Database, Zap, Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components';
import { toast } from '@/utils/toast';
import { ENDPOINTS } from '@/api/endpoints';
import { getClientAuthHeaders } from '@/lib/clientAuth';

const SystemAudit: React.FC = () => {
  const { allTrips, resolveDuplicateTrip, saasConfig, projects, vehicles, drivers } = useStore();
  const isAr = saasConfig.language === 'ar';
  
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Schema Health State
  const [schemaStatus, setSchemaStatus] = useState<any>(null);
  const [isCheckingSchema, setIsCheckingSchema] = useState(false);
  const [isForcingMigrate, setIsForcingMigrate] = useState(false);

  useEffect(() => {
    // Run the audit automatically when the component mounts or trips change
    const duplicates = detectDuplicateTrips(allTrips);
    setDuplicateGroups(duplicates);
  }, [allTrips]);

  const handleResolve = async (group: DuplicateGroup, keepTripId: string) => {
    setResolvingId(group.id);
    const cancelIds = group.trips.filter(t => t.trip_id !== keepTripId).map(t => t.trip_id);
    try {
      await resolveDuplicateTrip(keepTripId, cancelIds);
      // The store will update and trigger the useEffect to remove this group
    } finally {
      setResolvingId(null);
    }
  };

  const checkSchemaHealth = async () => {
    setIsCheckingSchema(true);
    try {
      const baseUrl = saasConfig?.apiConfig?.baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const url = `${baseUrl.replace(/\/$/, '')}${ENDPOINTS.SYSTEM.SCHEMA_HEALTH}`;
      const res = await fetch(url, { headers: getClientAuthHeaders(), credentials: 'include' });
      const data = await res.json();
      setSchemaStatus(data);
      if (data.status === 'HEALTHY') {
        toast.success(isAr ? 'قاعدة البيانات سليمة ومحدثة' : 'Database is healthy and up to date');
      }
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'فشل فحص قاعدة البيانات' : 'Failed to check database health');
    } finally {
      setIsCheckingSchema(false);
    }
  };

  const forceMigrate = async () => {
    setIsForcingMigrate(true);
    try {
      const baseUrl = saasConfig?.apiConfig?.baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const url = `${baseUrl.replace(/\/$/, '')}${ENDPOINTS.SYSTEM.FORCE_MIGRATE}`;
      const res = await fetch(url, { headers: getClientAuthHeaders(), credentials: 'include' });
      const data = await res.json();
      
      // Auto trigger a health check after force migrate
      await checkSchemaHealth();
      toast.success(isAr ? 'تمت محاولة تحديث المخطط (راجع النتيجة)' : 'Schema update attempted (Check results)');
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'فشل تحديث قاعدة البيانات' : 'Failed to force migrate');
    } finally {
      setIsForcingMigrate(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? 'تم نسخ الكود بنجاح' : 'Code copied to clipboard');
  };

  const getProjectName = (id?: string) => projects.find(p => p.project_id === id)?.project_name || id || 'N/A';
  const getVehiclePlate = (id?: string) => vehicles.find(v => v.vehicle_id === id)?.plate_no || id || 'N/A';
  const getDriverName = (id?: string) => drivers.find(d => d.driver_id === id)?.name || id || 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Database Schema Health Section */}
      <Card className="p-8 space-y-6 border-primary/20">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Database size={24} /> 
              {isAr ? 'فحص صحة قاعدة البيانات (Schema Health)' : 'Database Schema Health Check'}
            </h3>
            <p className="text-sm font-medium text-text-subtle leading-relaxed max-w-2xl">
              {isAr 
                ? 'هذه الأداة تقوم بالاتصال المباشر مع قاعدة بيانات السيرفر لمقارنة الأعمدة والأنواع الحالية مع ما يتطلبه الكود. مفيدة جداً بعد التحديثات لاكتشاف أي أعمدة ناقصة.'
                : 'This tool connects directly to the production database to compare current tables/columns with what the code expects. Highly useful after deployments.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button variant="ghost" onClick={checkSchemaHealth} isLoading={isCheckingSchema} icon={RefreshCw}>
              {isAr ? 'فحص الآن' : 'Check Health'}
            </Button>
            <Button variant="primary" onClick={forceMigrate} isLoading={isForcingMigrate} icon={Zap} className="bg-amber-500 hover:bg-amber-600 border-none shadow-lg shadow-amber-500/20 text-white">
              {isAr ? 'مزامنة إجبارية' : 'Force Sync'}
            </Button>
          </div>
        </div>

        {schemaStatus && (
          <div className={`mt-6 p-6 rounded-2xl border ${schemaStatus.status === 'HEALTHY' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              {schemaStatus.status === 'HEALTHY' ? <CheckCircle2 className="text-emerald-500" size={28} /> : <ShieldAlert className="text-rose-500" size={28} />}
              <h4 className={`text-lg font-bold ${schemaStatus.status === 'HEALTHY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {schemaStatus.status === 'HEALTHY' ? (isAr ? 'قاعدة البيانات متطابقة تماماً 100%' : 'Database Schema is 100% Healthy') : (isAr ? 'يوجد أعمدة مفقودة أو تعارضات (تتطلب تدخل يدوي)' : 'Missing columns or conflicts detected (Manual intervention required)')}
              </h4>
            </div>

            {schemaStatus.status === 'NEEDS_ATTENTION' && schemaStatus.manualSQL && (
              <div className="mt-4 space-y-4">
                <p className="text-sm font-bold text-text-main">
                  {isAr 
                    ? 'بسبب قيود الصلاحيات على السيرفر (cPanel)، لا يمكن إضافة الأعمدة بشكل تلقائي. يرجى نسخ الكود التالي وتنفيذه في phpPgAdmin:' 
                    : 'Due to cPanel permissions, ALTER TABLE cannot be run automatically. Please copy the SQL below and execute it in phpPgAdmin:'}
                </p>
                <div className="relative group">
                  <pre className="bg-surface border border-border rounded-xl p-4 text-xs font-mono text-primary-600 overflow-x-auto" dir="ltr">
                    {schemaStatus.manualSQL}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(schemaStatus.manualSQL)}
                    className="absolute top-3 right-3 p-2 bg-surface shadow-md border border-border rounded-lg text-text-subtle hover:text-primary hover:border-primary transition-all opacity-0 group-hover:opacity-100"
                    title={isAr ? 'نسخ الكود' : 'Copy SQL'}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}
            
            {schemaStatus.errors && schemaStatus.errors.length > 0 && (
              <div className="mt-4 p-4 bg-surface rounded-xl border border-border">
                <h5 className="text-xs font-black uppercase text-text-subtle mb-2 tracking-widest">{isAr ? 'تفاصيل الأخطاء:' : 'Error Details:'}</h5>
                <ul className="list-disc list-inside text-xs text-rose-500 space-y-1" dir="ltr">
                  {schemaStatus.errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* System Status Banner */}
      <div className={`p-6 rounded-[2rem] border ${duplicateGroups.length > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} flex items-start gap-4`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${duplicateGroups.length > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {duplicateGroups.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
        </div>
        <div>
          <h3 className={`text-xl font-bold ${duplicateGroups.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {duplicateGroups.length > 0 
              ? (isAr ? 'تم اكتشاف بيانات متعارضة أو متكررة' : 'Conflicts or Duplicates Detected')
              : (isAr ? 'سجلات الرحلات خالية من التعارضات' : 'Trip Records are Clean and Free of Conflicts')}
          </h3>
          <p className="text-sm text-text-subtle mt-1 font-medium">
            {isAr 
              ? 'يقوم النظام بالتدقيق الذاتي بشكل مستمر للتأكد من عدم إدخال نفس الرحلة مرتين من مصادر مختلفة.'
              : 'The system continuously self-audits to ensure the same trip is not entered twice.'}
          </p>
        </div>
      </div>

      {/* Conflicts List */}
      {duplicateGroups.length > 0 && (
        <div className="space-y-8">
          <h4 className="text-lg font-bold text-text-main flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-500" />
            {isAr ? 'الحالات التي تتطلب قرارك' : 'Cases Requiring Your Decision'}
          </h4>
          
          <div className="grid grid-cols-1 gap-8">
            {duplicateGroups.map((group) => (
              <Card key={group.id} className="p-6 border-rose-500/20 shadow-lg shadow-rose-500/5 overflow-hidden relative">
                <div className="absolute top-0 start-0 w-1.5 h-full bg-rose-500" />
                
                <div className="mb-6">
                  <h5 className="font-bold text-lg text-text-main">{isAr ? 'رحلة مكررة' : 'Duplicate Trip'}</h5>
                  <p className="text-sm text-text-subtle">{group.description}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.trips.map((trip) => (
                    <div key={trip.trip_id} className="bg-surface-subtle border border-border rounded-2xl p-5 hover:border-primary/30 transition-all flex flex-col justify-between">
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                          <span className="text-xs font-mono font-bold text-text-subtle bg-surface px-2 py-1 rounded">#{trip.trip_id}</span>
                          <span className="text-xs text-text-subtle flex items-center gap-1">
                            <Clock size={12} /> {new Date((trip as any).created_at || trip.date || Date.now()).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin size={16} className="text-primary mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase font-black text-text-subtle tracking-wider">{isAr ? 'المشروع' : 'Project'}</p>
                              <p className="text-sm font-bold">{getProjectName(trip.project_id)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <User size={16} className="text-blue-500 mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase font-black text-text-subtle tracking-wider">{isAr ? 'السائق' : 'Driver'}</p>
                              <p className="text-sm font-bold">{getDriverName(trip.driver_id)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Truck size={16} className="text-emerald-500 mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase font-black text-text-subtle tracking-wider">{isAr ? 'المركبة' : 'Vehicle'}</p>
                              <p className="text-sm font-bold">{getVehiclePlate(trip.vehicle_id)}</p>
                            </div>
                          </div>
                          
                          {trip.notes && (
                            <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                              <p className="text-[10px] uppercase font-black text-text-subtle tracking-wider mb-1">{isAr ? 'ملاحظات' : 'Notes'}</p>
                              <p className="text-xs text-text-main line-clamp-2">{trip.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button 
                        variant="primary" 
                        className="w-full"
                        isLoading={resolvingId === group.id}
                        onClick={() => handleResolve(group, trip.trip_id)}
                      >
                        {isAr ? 'احتفظ بهذا السجل' : 'Keep This Record'}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAudit;
