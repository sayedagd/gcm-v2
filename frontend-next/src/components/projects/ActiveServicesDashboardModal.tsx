import React, { useMemo, useState } from 'react';
import { Modal } from '@/components';
import { useStore } from '@/context';
import { LayoutGrid, MapPin, Search, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ActiveServicesDashboardModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { projects, projectServices, trips, services, saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const activeServicesData = useMemo(() => {
    const data: any[] = [];
    
    projects.filter(p => p.status === 'ACTIVE').forEach(p => {
      const pServices = projectServices.filter(ps => ps.project_id === p.project_id);
      
      const pData = {
        project: p,
        services: [] as any[]
      };

      pServices.forEach(ps => {
        const serviceTrips = trips.filter(t => t.project_id === p.project_id && t.service_id === ps.service_id);
        const actual = serviceTrips.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
        const target = Number(ps.quantity) || 0;
        
        pData.services.push({
          projectService: ps,
          service: services.find(s => s.service_id === ps.service_id),
          actual,
          target
        });
      });

      if (pData.services.length > 0) {
        data.push(pData);
      }
    });
    
    return data;
  }, [projects, projectServices, trips, services]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return activeServicesData;
    const q = searchTerm.toLowerCase();
    return activeServicesData.filter(d => 
      d.project.project_name.toLowerCase().includes(q) ||
      d.services.some((s: any) => 
        (s.service?.service_name || '').toLowerCase().includes(q)
      )
    );
  }, [activeServicesData, searchTerm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isAr ? 'لوحة الخدمات النشطة' : 'Active Services Dashboard'} size="xl">
      <div className="p-6 space-y-6">
        
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-subtle" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث باسم المشروع أو الخدمة...' : 'Search by project or service...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-3 bg-surface-subtle border border-border rounded-xl text-sm font-bold text-text-main placeholder-text-subtle focus:outline-none focus:border-primary/50"
          />
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-10 bg-surface-subtle rounded-xl border border-border">
            <LayoutGrid size={32} className="mx-auto text-text-subtle opacity-30 mb-3" />
            <p className="text-text-subtle font-medium text-sm">{isAr ? 'لا توجد خدمات نشطة' : 'No active services found.'}</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pe-2 custom-scrollbar">
            {filteredData.map((data, idx) => {
              const isExpanded = expandedProjects[data.project.project_id] !== false; // Default to true if you want them expanded initially, or false if collapsed. Let's default to false except the first one? Let's default all to false, or keep state simple.
              return (
              <div key={idx} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div 
                  className="bg-surface-subtle px-5 py-3 border-b border-border flex items-center justify-between cursor-pointer hover:bg-surface-subtle/80 transition-colors"
                  onClick={() => toggleProject(data.project.project_id)}
                >
                  <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    {data.project.project_name}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase">
                      {data.services.length} {isAr ? 'خدمات' : 'Services'}
                    </span>
                    <ChevronDown size={16} className={`text-text-subtle transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {isExpanded && (
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  {data.services.map((svc: any, sIdx: number) => {
                    const progressPct = svc.target > 0 ? Math.min(100, Math.round((svc.actual / svc.target) * 100)) : 0;
                    
                    return (
                      <div key={sIdx} className="bg-surface-subtle p-3 rounded-xl border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-text-main line-clamp-1 flex-1">{svc.service?.service_name || (isAr ? 'خدمة غير معروفة' : 'Unknown Service')}</span>
                          <span className="text-[10px] font-bold text-text-subtle ms-2">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-text-subtle uppercase">
                          <span>{svc.actual} {isAr ? 'مستهلك' : 'Done'}</span>
                          <span>{svc.target} {isAr ? 'مستهدف' : 'Target'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ActiveServicesDashboardModal;
