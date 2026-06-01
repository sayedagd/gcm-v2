import React, { useMemo, useState } from 'react';
import { useStore } from "@/context";
import { TripStatus, Role, Trip } from "@/types";
import { Clock, Truck, MapPin, FileCheck, Navigation, Package, UserCheck, CheckCircle2, ChevronDown, Phone, Building2, ImageIcon, Eye, FileText, Download, Calendar } from 'lucide-react';
import TripDetailsModal from '@/components/trips/TripDetailsModal';
import { formatTripStatusByRole, getTripStatusColor, getTripPriorityColor, resolveImagePath, safeParseArray } from '@/utils/helpers';
import { useClientScope } from '@/hooks/useClientScope';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

const getDateGroup = (dateStr: string, isAr: boolean) => {
    if (!dateStr) return isAr ? 'غير محدد' : 'Unknown';
    const tripDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    tripDate.setHours(0,0,0,0);
    
    // Check invalid date
    if (isNaN(tripDate.getTime())) return isAr ? 'غير محدد' : 'Unknown';

    const diffTime = today.getTime() - tripDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return isAr ? 'رحلات اليوم' : 'Today';
    if (diffDays === 1) return isAr ? 'رحلات الأمس' : 'Yesterday';
    if (diffDays === 2) return isAr ? 'قبل أمس' : 'Day Before Yesterday';
    if (diffDays > 2 && diffDays <= 7) return isAr ? 'الأسبوع الماضي' : 'Last Week';
    if (diffDays < 0) return isAr ? 'مجدولة (قادمة)' : 'Upcoming';
    
    return isAr ? 'أقدم من ذلك' : 'Older';
};

const TrackTrip: React.FC = () => {
    const { projects, currentUser, vehicles, drivers, services, facilities, users } = useStore();
    const { t, isAr } = useTranslation();
    const { scopedTrips } = useClientScope();
    const { projectMap, vehicleMap, driverMap, serviceMap, facilityMap } = useLookupMaps();
    
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
    const [approveTrip, setApproveTrip] = useState<Trip | null>(null);

    // Grouping logic
    const groupedTrips = useMemo(() => {
        const sorted = [...scopedTrips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: Record<string, Trip[]> = {};
        
        // Define exact order for groups
        const orderedKeys = isAr 
            ? ['رحلات اليوم', 'رحلات الأمس', 'قبل أمس', 'الأسبوع الماضي', 'أقدم من ذلك', 'مجدولة (قادمة)', 'غير محدد']
            : ['Today', 'Yesterday', 'Day Before Yesterday', 'Last Week', 'Older', 'Upcoming', 'Unknown'];

        sorted.forEach(trip => {
            const groupName = getDateGroup(trip.date, isAr);
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(trip);
        });

        // Convert to ordered array
        return orderedKeys.filter(k => groups[k]?.length > 0).map(key => ({
            label: key,
            trips: groups[key]
        }));
    }, [scopedTrips, isAr]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
                        <Calendar className="text-primary-500" /> {t('tracking.title') || (isAr ? 'تتبع الرحلات' : 'Track Trips')}
                    </h1>
                    <p className="text-text-subtle text-sm font-bold mt-1">
                        {isAr ? 'عرض الرحلات مرتبة حسب الإطار الزمني.' : 'View trips organized by timeframes.'}
                    </p>
                </div>
            </div>

            {groupedTrips.length === 0 ? (
                <div className="bg-surface-subtle shadow-sm rounded-2xl h-[400px] flex flex-col items-center justify-center text-text-subtle border border-border">
                    <Calendar size={64} className="mb-6 opacity-20" />
                    <h3 className="text-xl font-bold">{isAr ? 'لا توجد رحلات' : 'No Trips Found'}</h3>
                    <p className="opacity-60">{isAr ? 'لم يتم تسجيل أي رحلات بعد للحساب الخاص بك.' : 'No trips have been recorded yet for your account.'}</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedTrips.map(group => (
                        <div key={group.label} className="space-y-4">
                            {/* Group Header */}
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-black text-text-main bg-surface px-4 py-1.5 rounded-xl border border-border shadow-sm inline-block">
                                    {group.label}
                                </h3>
                                <div className="h-px bg-border flex-1"></div>
                                <span className="text-xs font-bold text-text-subtle bg-surface px-2 py-1 rounded-md border border-border">
                                    {group.trips.length} {isAr ? 'رحلة' : 'Trips'}
                                </span>
                            </div>

                            {/* Trips List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.trips.map(trip => {
                                    const project = projectMap[trip.project_id];
                                    const vehicle = vehicleMap[trip.vehicle_id];
                                    const driver = driverMap[trip.driver_id];
                                    const service = serviceMap[trip.service_id];
                                    const facility = facilityMap[trip.facility_id];

                                    const displayVehicle = vehicle?.plate_no || trip.vehicle_id || (isAr ? 'غير محدد' : 'Not Assigned');
                                    const displayDriver = driver?.name || trip.driver_id || (isAr ? 'غير محدد' : 'Not Assigned');
                                    const locationUrl = trip.request_location_url || (trip as any).trip_location_url || (project?.location?.startsWith('http') ? project.location : null);
                                    const isExpanded = expandedTripId === trip.trip_id;

                                    return (
                                        <motion.div
                                            key={`track-${trip.trip_id}`}
                                            onClick={() => setExpandedTripId(isExpanded ? null : trip.trip_id)}
                                            className={`bg-surface rounded-2xl border-2 transition-all p-1 overflow-hidden group shadow-sm cursor-pointer ${isExpanded ? 'border-primary-500 shadow-xl shadow-primary-500/10' : 'border-border hover:border-primary-500/50'}`}
                                        >
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex gap-3">
                                                        {(() => {
                                                            const sc = getTripStatusColor(trip.status);
                                                            const StatusIcon = trip.status === TripStatus.REQUESTED ? Clock :
                                                                trip.status === TripStatus.ASSIGNED ? UserCheck :
                                                                    trip.status === TripStatus.EN_ROUTE ? Navigation :
                                                                        trip.status === TripStatus.LOADING ? Package :
                                                                            trip.status === TripStatus.PENDING_APPROVAL ? CheckCircle2 :
                                                                                trip.status === TripStatus.COMPLETED ? CheckCircle2 :
                                                                                trip.status === TripStatus.PENDING_DOCS ? FileCheck : Truck;
                                                            return (
                                                                <div onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); }} className={`w-11 h-11 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-sm ${sc.bg} ${sc.text}`}>
                                                                    <StatusIcon size={20} />
                                                                </div>
                                                            );
                                                        })()}
                                                        <div>
                                                            <h4 className="font-black text-text-main text-sm">{project?.project_name || trip.project_id}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-text-subtle font-bold uppercase tracking-widest leading-none mt-1">{trip.trip_id} • {trip.time}</p>
                                                                {trip.priority && trip.priority !== 'NORMAL' && (() => {
                                                                    const pc = getTripPriorityColor(trip.priority);
                                                                    return <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${pc.bg} ${pc.text} mt-1`}>{trip.priority}</span>;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${getTripStatusColor(trip.status).bg} ${getTripStatusColor(trip.status).text} border border-black/5`}>
                                                            {formatTripStatusByRole(trip.status, currentUser.role, isAr)}
                                                        </span>
                                                        <ChevronDown size={18} className={`text-text-subtle transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "circOut" }} className="border-t border-border bg-surface-subtle">
                                                        <div className="p-4 space-y-4">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-surface p-2.5 rounded-xl border border-border">
                                                                    <div className="flex items-center gap-1.5 text-text-subtle mb-1"><Truck size={12} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'المركبة' : 'Fleet'}</p></div>
                                                                    <h4 className="font-bold text-text-main text-xs line-clamp-1">{displayVehicle}</h4>
                                                                </div>
                                                                <div className="bg-surface p-2.5 rounded-xl border border-border">
                                                                    <div className="flex items-center gap-1.5 text-text-subtle mb-1"><UserCheck size={12} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'السائق' : 'Driver'}</p></div>
                                                                    <h4 className="font-bold text-text-main text-xs line-clamp-1">{displayDriver}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex items-start gap-2 text-xs font-bold text-text-main">
                                                                    <MapPin size={14} className="text-primary-500 mt-0.5" /> 
                                                                    {locationUrl ? (
                                                                        <a href={locationUrl} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">{isAr ? 'عرض الموقع على الخريطة' : 'View Location on Map'}</a>
                                                                    ) : (isAr ? 'لم يتم تحديد موقع' : 'No Location Set')}
                                                                </div>
                                                                <div className="flex items-start gap-2 text-xs font-bold text-text-main">
                                                                    <Package size={14} className="text-orange-500 mt-0.5" /> 
                                                                    {service?.service_name || 'General Disposal'} • {trip.quantity} {trip.unit}
                                                                </div>
                                                            </div>
                                                            {(() => {
                                                                const proofs = safeParseArray(trip.proof_images);
                                                                const hasPhotos = proofs.length > 0 || trip.container_image_before || trip.container_image_after;
                                                                if (!hasPhotos) return null;
                                                                return (
                                                                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                                                                        <div className="flex items-center gap-2 text-text-subtle"><ImageIcon size={14} /><p className="text-[9px] font-black tracking-widest">{isAr ? 'الصور الميدانية' : 'Field Photos'}</p></div>
                                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
                                                                            {[{ src: trip.container_image_before, label: 'BEFORE' }, { src: trip.container_image_after, label: 'AFTER' }, ...proofs.map(p => ({ src: p, label: 'PROOF' }))].filter(p => p.src).map((img, i) => (
                                                                                <div key={i} className="w-16 h-16 rounded-lg bg-surface border border-border overflow-hidden relative group shrink-0" onClick={(e) => { e.stopPropagation(); window.open(resolveImagePath(img.src!), '_blank') }}>
                                                                                    <img src={resolveImagePath(img.src!)} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                                                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={16} className="text-white drop-shadow-md" /></div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                                                                <button onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); }} className="flex-1 py-2.5 bg-surface border border-border text-text-main rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-colors">
                                                                    <FileText size={14} /> {isAr ? 'عـرض التفــاصيل' : 'Details'}
                                                                </button>
                                                                {trip.status === TripStatus.PENDING_APPROVAL && (
                                                                    <button onClick={(e) => { e.stopPropagation(); setApproveTrip(trip); }} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-purple-500 shadow-lg shadow-purple-500/20 transition-colors">
                                                                        <CheckCircle2 size={14} /> {isAr ? 'اعتمـاد الرحلة' : 'Approve'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedTrip && (
                <TripDetailsModal isOpen={!!selectedTrip} onClose={() => setSelectedTrip(null)} selectedTrip={selectedTrip} />
            )}
            <SignatureApproveModal 
                isOpen={!!approveTrip} 
                trip={approveTrip} 
                onClose={() => setApproveTrip(null)} 
            />
        </div>
    );
};

export default TrackTrip;
