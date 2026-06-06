import React, { useMemo } from 'react';
import { Modal } from '@/components';
import { useStore } from '@/context';
import { AlertTriangle, MapPin, Box } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ApproachingServicesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { projects, projectServices, trips, services, saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';

  const approachingServices = useMemo(() => {
    const list: any[] = [];
    
    projects.filter(p => p.status === 'ACTIVE').forEach(p => {
      const pServices = projectServices.filter(ps => ps.project_id === p.project_id);
      
      pServices.forEach(ps => {
        const warningThreshold = Number(ps.warning_threshold) || 0;
        const target = Number(ps.quantity) || 0;
        
        if (warningThreshold <= 0) return; // No threshold set

        const serviceTrips = trips.filter(t => t.project_id === p.project_id && t.service_id === ps.service_id);
        const actual = serviceTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
        
        if (actual >= warningThreshold && actual < target) {
          list.push({
            project: p,
            projectService: ps,
            service: services.find(s => s.service_id === ps.service_id),
            actual,
            target,
            warningThreshold
          });
        }
      });
    });
    
    // Sort by progress descending
    return list.sort((a, b) => (b.actual / b.target) - (a.actual / a.target));
  }, [projects, projectServices, trips, services]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isAr ? 'الخدمات المقتربة من الانتهاء' : 'Services Approaching Limit'} size="xl">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <AlertTriangle className="text-amber-500 flex-shrink-0" size={24} />
          <p className="text-sm font-bold text-amber-600">
            {isAr 
              ? 'توضح هذه القائمة الخدمات التي تخطت حاجز التنبيه الخاص بها في المشاريع النشطة، وتحتاج إلى تجديد أو متابعة.'
              : 'This list shows services that have crossed their "Alert At" threshold in active projects and require attention.'}
          </p>
        </div>

        {approachingServices.length === 0 ? (
          <div className="text-center py-10 bg-surface-subtle rounded-xl border border-border">
            <p className="text-text-subtle font-medium text-sm">{isAr ? 'لا توجد خدمات مقتربة من الانتهاء حالياً.' : 'No services approaching limit currently.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approachingServices.map((item, idx) => {
              const progressPct = Math.min(100, Math.round((item.actual / item.target) * 100));
              const isCritical = progressPct >= 95;
              
              return (
                <div key={idx} className={`p-4 rounded-xl border ${isCritical ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                        <Box size={14} className={isCritical ? 'text-rose-500' : 'text-amber-500'} />
                        {isAr ? item.service?.name_ar : item.service?.name_en}
                      </h4>
                      <p className="text-xs font-bold text-text-subtle flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {item.project.project_name}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${isCritical ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-600'}`}>
                      {progressPct}%
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-text-subtle uppercase tracking-wider">
                      <span>{isAr ? 'المستهلك' : 'Consumed'}: {item.actual}</span>
                      <span>{isAr ? 'الهدف' : 'Target'}: {item.target}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden border border-border">
                      <div className={`h-full rounded-full ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-[10px] text-text-subtle pt-1 font-mono">
                      Alert At: {item.warningThreshold}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ApproachingServicesModal;
