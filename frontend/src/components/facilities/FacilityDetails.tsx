import React from 'react';
import { Facility } from '@/types';
import { Modal, Card, Button } from '@/components';
import { Building2, MapPin, FileText, CheckCircle2, AlertCircle, ExternalLink, Edit } from 'lucide-react';

interface FacilityDetailsProps {
    isOpen: boolean;
    onClose: () => void;
    facility: Facility;
    isAr: boolean;
    onEdit: () => void;
}

const FacilityDetails: React.FC<FacilityDetailsProps> = ({
    isOpen, onClose, facility, isAr, onEdit
}) => {
    if (!facility) return null;

    const isExpired = facility.contract_end && new Date(facility.contract_end) < new Date();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isAr ? 'تفاصيل المرفق' : 'Facility Dossier'}
            size="xl"
        >
            <div className="p-8 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Profile Card */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <Building2 size={48} />
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-4xl font-black text-text-main tracking-tight uppercase">{facility.name}</h2>
                                <div className="flex gap-4 mt-2">
                                    <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary" />
                                        {facility.type}
                                    </div>
                                    <div className={`px-4 py-1 rounded-full border text-[9px] font-bold tracking-widest uppercase ${facility.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                        {facility.status}
                                    </div>
                                </div>
                            </div>
                            <Button variant="secondary" onClick={onEdit} icon={Edit}>{isAr ? 'تعديل' : 'Edit'}</Button>
                        </div>
                    </div>
                </div>

                {/* Contract Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8 space-y-6 border border-border bg-surface shadow-sm">
                        <div className="flex items-center gap-4 text-primary">
                            <FileText size={24} />
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{isAr ? 'بيانات التعاقد' : 'Contract Intelligence'}</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-border/50">
                                <span className="text-[10px] font-bold text-text-subtle uppercase">{isAr ? 'رقم العقد' : 'Ref Code'}</span>
                                <span className="text-sm font-bold text-text-main font-mono">{facility.contract_no || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border/50">
                                <span className="text-[10px] font-bold text-text-subtle uppercase">{isAr ? 'الحالة القانونية' : 'Legal Status'}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isExpired ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {isExpired ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                                    {isExpired ? (isAr ? 'منتهي' : 'Expired') : (isAr ? 'ساري' : 'Valid')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-[10px] font-bold text-text-subtle uppercase">{isAr ? 'تاريخ الانتهاء' : 'Termination Date'}</span>
                                <span className="text-sm font-bold text-text-main">{facility.contract_end || '---'}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 space-y-6 border border-border bg-surface shadow-sm">
                        <div className="flex items-center gap-4 text-primary">
                            <MapPin size={24} />
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{isAr ? 'الإحداثيات الجغرافية' : 'Geospatial Data'}</h3>
                        </div>

                        <div className="space-y-6">
                            <p className="text-xs text-text-subtle font-medium leading-relaxed">
                                {isAr ? 'موقع المرفق المعتمد لعمليات التخلص والمعالجة.' : 'Certified location for discharge and treatment operations.'}
                            </p>
                            {facility.location_url ? (
                                <a
                                    href={facility.location_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-3 w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary-dark transition-all transform active:scale-95 shadow-lg shadow-primary/20"
                                >
                                    <ExternalLink size={16} />
                                    {isAr ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 bg-surface-subtle rounded-2xl border border-dashed border-border text-text-subtle">
                                    <MapPin size={24} className="opacity-20 mb-2" />
                                    <span className="text-[10px] font-bold uppercase">{isAr ? 'لا يوجد موقع مسجل' : 'No GPS Coordinates'}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Accepted Services */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 text-primary">
                        <CheckCircle2 size={24} />
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{isAr ? 'الخدمات المصرح بها' : 'Certified Waste Lines'}</h3>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {(() => {
                            const accepted = Array.isArray(facility.accepted_services) ? facility.accepted_services : [];
                            if (accepted.length > 0) {
                                return accepted.map(sid => (
                                    <div key={sid} className="px-6 py-3 bg-surface border border-primary/20 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {sid}
                                    </div>
                                ));
                            }
                            return (
                                <div className="text-xs text-text-subtle italic font-medium">
                                    {isAr ? 'لم يتم تحديد خدمات مقبولة بعد.' : 'No accepted services specified yet.'}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Details / Instructions */}
                {facility.details && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <h3 className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'تعليمات إضافية' : 'Operational Instructions'}</h3>
                        <div className="p-6 bg-surface-subtle rounded-2xl text-sm font-medium leading-relaxed italic text-text-main border border-border">
                            {facility.details}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default FacilityDetails;
