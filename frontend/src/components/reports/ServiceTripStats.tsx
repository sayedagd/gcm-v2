import React, { useState } from 'react';
import { Card, Table, Select, Button } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { Trip, Project, Service, TripStatus, Role, NotificationType } from '@/types';
import { formatDate, formatNumber } from '@/utils/helpers';
import { Link } from 'react-router-dom';
import { Truck, FileText, UserCheck, Briefcase, FileCheck, Recycle, Eye, Package } from 'lucide-react';
import { useStore } from '@/context';
import TripDetailsModal from '@/components/trips/TripDetailsModal';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';

interface ServiceTripStatsProps {
    trips: Trip[];
    projects: Project[];
    services: Service[];
    isAr: boolean;
}

const ServiceTripStats: React.FC<ServiceTripStatsProps> = ({ trips, projects, services, isAr }) => {
    const { t } = useTranslation();
    const { companies, drivers, vehicles, upsertTrip, addNotification, currentUser } = useStore();
    
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [signatureModalTrip, setSignatureModalTrip] = useState<Trip | null>(null);

    // Filter properties to match the layout
    const columns = [
        {
            key: 'trip_id',
            label: isAr ? 'الهوية والجدولة' : 'ID & SCHEDULE',
            render: (_: any, trip: Trip) => (
                <div className="flex flex-col gap-1">
                    <Link to={`/t?id=${trip.trip_id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none w-fit">
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse bg-success`} />
                        <p className="font-mono text-[10px] font-bold text-primary tracking-tight hover:underline">{trip.trip_id}</p>
                    </Link>
                    <p className="text-lg font-bold text-text-main leading-none">{formatDate(trip.date)}</p>
                    <p className="text-[10px] font-bold text-text-subtle tracking-widest uppercase">{trip.time}</p>
                </div>
            )
        },
        {
            key: 'project_id',
            label: isAr ? 'العميل والموقع' : 'ENTITY & LOCATION',
            render: (val: string) => {
                const project = projects.find(p => p.project_id === val);
                const company = companies.find(c => c.company_id === project?.company_id);
                return (
                    <div className="space-y-1">
                        <Link to={`/projects?id=${project?.project_id}`} className="font-bold text-text-main flex items-center gap-2 hover:text-primary transition-colors hover:underline" onClick={e => e.stopPropagation()}>
                            <Briefcase size={14} className="text-primary" />
                            {project?.project_name || val || '---'}
                        </Link>
                        <Link to={`/companies?id=${company?.company_id}`} className="text-[10px] font-bold text-text-subtle tracking-widest uppercase hover:text-primary transition-colors block" onClick={e => e.stopPropagation()}>
                            {company?.company_name || '---'}
                        </Link>
                    </div>
                );
            }
        },
        {
            key: 'service_id',
            label: isAr ? 'نوع الخدمة' : 'SERVICE TYPE',
            render: (val: string) => {
                const srv = services.find(s => s.service_id === val);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Package size={14} /></div>
                        <span className="font-bold text-[11px] text-text-main">{srv?.service_name || val || '---'}</span>
                    </div>
                );
            }
        },
        {
            key: 'logistics',
            label: isAr ? 'الفريق والأسطول' : 'CREW & FLEET',
            render: (_: any, trip: Trip) => (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center text-amber"><UserCheck size={14} /></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Operator</span>
                            <Link to={`/drivers?id=${trip.driver_id}`} className="font-bold text-text-main text-[11px] hover:text-primary hover:underline transition-colors" onClick={e => e.stopPropagation()}>
                                {drivers.find(d => d.driver_id === trip.driver_id)?.name || 'N/A'}
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-surface"><Truck size={14} /></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-text-subtle tracking-widest uppercase">Plate ID</span>
                            <Link to={`/fleet?id=${trip.vehicle_id}`} className="font-bold text-text-main text-[11px] hover:text-primary hover:underline transition-colors" onClick={e => e.stopPropagation()}>
                                {vehicles.find(v => v.vehicle_id === trip.vehicle_id)?.plate_no || 'N/A'}
                            </Link>
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'quantity',
            label: isAr ? 'الأوزان المعتمدة' : 'VERIFIED WEIGHT',
            className: 'text-center',
            render: (val: string, trip: Trip) => (
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-text-main tracking-tight">{formatNumber(val)}</span>
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1 bg-primary/10 px-2 py-0.5 rounded-full">{trip.unit}</span>
                </div>
            )
        },
        {
            key: 'status',
            label: isAr ? 'حالة التشغيل' : 'LIVE STATUS',
            render: (_: any, trip: Trip) => {
                let statusLabel = trip.status as string;
                if (isAr) {
                    if (trip.status === TripStatus.REQUESTED) statusLabel = 'طلب جديد';
                    else if (trip.status === TripStatus.IN_PROGRESS) statusLabel = 'قيد التنفيذ';
                    else if (trip.status === TripStatus.PENDING_DOCS) statusLabel = 'انتظار المستندات';
                    else if (trip.status === TripStatus.PENDING_REVIEW) statusLabel = 'مراجعة';
                    else if (trip.status === TripStatus.COMPLETED) statusLabel = 'مكتمل';
                    else if (trip.status === TripStatus.CANCELLED) statusLabel = 'ملغي';
                }

                return (
                    <div onClick={e => e.stopPropagation()}>
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase ${
                            trip.status === TripStatus.COMPLETED ? 'text-success bg-success-muted' :
                            trip.status === TripStatus.CANCELLED ? 'text-danger bg-danger-muted' :
                            trip.status === TripStatus.PENDING_DOCS ? 'text-amber bg-amber-muted border border-amber/20' :
                            trip.status === TripStatus.PENDING_REVIEW ? 'text-primary bg-primary/10 border border-primary/20' :
                            'text-primary bg-primary/10'
                        }`}>
                            {statusLabel}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'docs',
            label: isAr ? 'المستندات' : 'DOCS',
            render: (_: any, trip: Trip) => (
                <div className="flex -space-x-1.5">
                    {trip.manifest_file && currentUser.role !== Role.SUBCONTRACTOR && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="Manifest"><FileText size={12} /></div>}
                    {trip.delivery_note_file && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="DN"><FileCheck size={12} /></div>}
                    {trip.recycle_file && currentUser.role !== Role.SUBCONTRACTOR && <div className="p-1.5 bg-primary text-surface rounded-lg shadow-lg border-2 border-surface" title="Recycle"><Recycle size={12} /></div>}
                </div>
            )
        },
        {
            key: 'actions',
            label: '',
            className: 'text-right',
            render: (_: any, trip: Trip) => {
                const canApprove = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);
                return (
                    <div className="flex items-center justify-end gap-2">
                        {canApprove && trip.status === TripStatus.PENDING_REVIEW && currentUser.role !== Role.SUBCONTRACTOR && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setSignatureModalTrip(trip);
                                }}
                                className="bg-success hover:bg-success-strong text-surface"
                            >
                                {isAr ? 'اعتماد' : 'Approve'}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setIsDetailModalOpen(true); }}
                            icon={Eye}
                            className="text-text-subtle hover:text-primary"
                        />
                    </div>
                );
            }
        }
    ];

    return (
        <Card className="rounded-2xl overflow-hidden border-2 border-border shadow-lg">
            <Table
                isAr={isAr}
                data={trips}
                columns={columns}
                onRowClick={(trip) => { setSelectedTrip(trip); setIsDetailModalOpen(true); }}
                emptyMessage={t('dashboard.noTrips')}
            />
            <TripDetailsModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                selectedTrip={selectedTrip}
            />
            <SignatureApproveModal
                isOpen={!!signatureModalTrip}
                trip={signatureModalTrip}
                onClose={() => setSignatureModalTrip(null)}
                onApproveSuccess={() => setSignatureModalTrip(null)}
            />
        </Card>
    );
};

export default ServiceTripStats;

