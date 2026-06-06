import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Briefcase, Box, ChevronRight } from 'lucide-react';
import { Company, Project, Service } from '@/types';

interface DrilldownSelectionProps {
    isAr: boolean;
    companies: Company[];
    projects: Project[];
    services: Service[];
    selectedCompany: string | null;
    selectedProject: string | null;
    selectedService: string | null;
    onSelectCompany: (id: string | null) => void;
    onSelectProject: (id: string | null) => void;
    onSelectService: (id: string | null) => void;
    isRestricted?: boolean;
}

const DrilldownSelection: React.FC<DrilldownSelectionProps> = ({
    isAr,
    companies,
    projects,
    services,
    selectedCompany,
    selectedProject,
    selectedService,
    onSelectCompany,
    onSelectProject,
    onSelectService,
    isRestricted
}) => {
    const currentCompany = companies.find(c => c.company_id === selectedCompany);
    const currentProject = projects.find(p => p.project_id === selectedProject);

    const step = !selectedCompany ? 'COMPANY' : !selectedProject ? 'PROJECT' : 'SERVICE';

    return (
        <div className="space-y-4">
            {/* Breadcrumbs / Active Filters */}
            <div className="flex flex-wrap items-center gap-2 px-2">
                <button
                    onClick={() => { if (!isRestricted) { onSelectCompany(null); onSelectProject(null); onSelectService(null); } }}
                    disabled={isRestricted}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${!selectedCompany ? 'bg-primary-500 text-white border-primary-600' : 'bg-surface text-text-subtle border-border'} ${isRestricted ? 'cursor-default opacity-70' : ''}`}
                >
                    {isAr ? 'الشركات' : 'Companies'}
                </button>

                {selectedCompany && (
                    <>
                        <ChevronRight size={14} className={`text-text-subtle ${isAr ? 'rotate-180' : ''}`} />
                        <button
                            onClick={() => { if (!isRestricted) { onSelectProject(null); onSelectService(null); } }}
                            disabled={isRestricted}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedCompany && !selectedProject ? 'bg-primary-500 text-white border-primary-600' : 'bg-surface text-text-subtle border-border'} ${isRestricted ? 'cursor-default opacity-70' : ''}`}
                        >
                            {currentCompany?.company_name}
                        </button>
                    </>
                )}

                {selectedProject && (
                    <>
                        <ChevronRight size={14} className={`text-text-subtle ${isAr ? 'rotate-180' : ''}`} />
                        <button
                            onClick={() => onSelectService(null)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedProject && !selectedService ? 'bg-primary-500 text-white border-primary-600' : 'bg-surface text-text-subtle border-border'}`}
                        >
                            {currentProject?.project_name}
                        </button>
                    </>
                )}
            </div>

            <AnimatePresence mode="wait">
                {step === 'COMPANY' && (
                    <motion.div
                        key="companies"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                    >
                        {companies.map(company => (
                            <button
                                key={company.company_id}
                                onClick={() => onSelectCompany(company.company_id)}
                                className="bg-surface p-6 rounded-3xl border-2 border-transparent hover:border-primary-500 hover:shadow-xl hover:shadow-primary-500/10 transition-all flex flex-col items-center gap-4 group text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                                    <Building2 size={32} />
                                </div>
                                <span className="font-bold text-sm text-text-main line-clamp-2">{company.company_name}</span>
                            </button>
                        ))}
                    </motion.div>
                )}

                {step === 'PROJECT' && (
                    <motion.div
                        key="projects"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                    >
                        {projects.map(project => (
                            <button
                                key={project.project_id}
                                onClick={() => onSelectProject(project.project_id)}
                                className="bg-surface p-6 rounded-3xl border-2 border-transparent hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all flex flex-col items-center gap-4 group text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                    <Briefcase size={32} />
                                </div>
                                <span className="font-bold text-sm text-text-main line-clamp-2">{project.project_name}</span>
                            </button>
                        ))}
                    </motion.div>
                )}

                {step === 'SERVICE' && (
                    <motion.div
                        key="services"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                    >
                        {services.map(service => (
                            <button
                                key={service.service_id}
                                onClick={() => onSelectService(service.service_id)}
                                className={`bg-surface p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group text-center ${selectedService === service.service_id ? 'border-primary-500 bg-primary-50/30' : 'border-transparent hover:border-primary-500'}`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${selectedService === service.service_id ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-600'}`}>
                                    <Box size={32} />
                                </div>
                                <span className="font-bold text-sm text-text-main line-clamp-2">{service.service_name}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DrilldownSelection;
