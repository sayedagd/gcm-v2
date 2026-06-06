"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useStore } from '@/context';
import { Trip, TripStatus, Role } from '@/types';
import { Card, Modal, Select, Button } from '@/components';
import { SignatureApproveModal } from '@/components/ui/SignatureApproveModal';
import { Truck, UserCheck, Zap, ArrowUp, Minus, ArrowDown, MapPin, Camera, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatTripStatus, getTripStatusColor, getTripPriorityColor, resolveImagePath } from '@/utils/helpers';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// [AR] استخراج الإحداثيات من رابط خرائط جوجل
// [EN] Extract coordinates from Google Maps URL
const extractCoords = (url?: string): [number, number] | null => {
    if (!url) return null;
    try {
        const match = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            const latStr = match[1];
            const lngStr = match[2];
            if (!latStr || !lngStr) return null;
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
    } catch (e) {
        console.error("Error parsing coordinates:", e);
    }
    return null;
};

// [AR] مكون لتحديث رؤية الخريطة (التركيز)
// [EN] Component to update map view (re-center)
const MapAutoCenter = ({ coords }: { coords: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [coords, map]);
    return null;
};

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const PRIORITY_ICONS: Record<string, React.ElementType> = { URGENT: Zap, HIGH: ArrowUp, NORMAL: Minus, LOW: ArrowDown };
const ACTIVE_STATUSES = [TripStatus.REQUESTED, TripStatus.ASSIGNED, TripStatus.EN_ROUTE, TripStatus.LOADING, TripStatus.PENDING_APPROVAL];

const TripQueue: React.FC = () => {
    const { saasConfig, trips, projects, services, drivers, vehicles, users, upsertTrip, currentUser, addNotification } = useStore();
    const isAr = saasConfig.language === 'ar';
    const isSuperUser = [Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role);

    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [assignModal, setAssignModal] = useState<Trip | null>(null);
    const [signatureModalTrip, setSignatureModalTrip] = useState<{trip: Trip, signer?: 'CLIENT' | 'GCM'} | null>(null);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState<Record<string, string>>({});

    // Role guard
    if (![Role.LOGISTICS, Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role)) {
        return <div className="text-center py-16 text-text-subtle font-bold">{isAr ? 'غير مصرح' : 'Unauthorized'}</div>;
    }

    const queueTrips = useMemo(() => {
        let filtered = trips.filter(t => ACTIVE_STATUSES.includes(t.status));
        if (statusFilter !== 'ALL') filtered = filtered.filter(t => t.status === statusFilter);
        return filtered.sort((a, b) => {
            const pa = PRIORITY_ORDER[a.priority || 'NORMAL'] ?? 2;
            const pb = PRIORITY_ORDER[b.priority || 'NORMAL'] ?? 2;
            if (pa !== pb) return pa - pb;
            return (a.date || '').localeCompare(b.date || '');
        });
    }, [trips, statusFilter]);

    const { projectMap, serviceMap, driverMap, vehicleMap } = useLookupMaps();
    const getProjectName = (id: string) => projectMap[id]?.project_name || id;
    const getServiceName = (id: string) => serviceMap[id]?.service_name || id;
    const getDriverName = (id: string) => driverMap[id]?.name || id;
    const getVehiclePlate = (id: string) => vehicleMap[id]?.plate_no || id;

    // [AR] استخراج المواقع لتعيينها على الخريطة
    // [EN] Map markers coordinates
    const mapMarkers = useMemo(() => {
        return queueTrips
            .map(t => ({
                id: t.trip_id,
                coords: extractCoords(t.trip_location_url),
                status: t.status,
                project: getProjectName(t.project_id)
            }))
            .filter(m => m.coords !== null) as { id: string, coords: [number, number], status: TripStatus, project: string }[];
    }, [queueTrips, projects]);

    const defaultCenter: [number, number] = [24.7136, 46.6753]; // Riyadh
            const firstMarker = mapMarkers[0];

    const handleAssign = useCallback(async () => {
        if (!assignModal || !selectedDriver || !selectedVehicle) return;
        if (![Role.LOGISTICS, Role.ADMIN, Role.REPORTS_MANAGER].includes(currentUser.role)) return;

        setIsSubmitting(true);
        try {
            await upsertTrip({
                ...assignModal,
                driver_id: selectedDriver,
                vehicle_id: selectedVehicle,
                status: TripStatus.ASSIGNED,
                assigned_at: new Date().toISOString(),
            });
            setAssignModal(null);
            setSelectedDriver('');
            setSelectedVehicle('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }, [assignModal, selectedDriver, selectedVehicle, upsertTrip, currentUser.role]);

    const handleOverrideStatus = useCallback(async (trip: Trip, newStatus: string) => {
        if (!isSuperUser) return;
        setIsSubmitting(true);
        try {
            await upsertTrip({ ...trip, status: newStatus as TripStatus });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }, [isSuperUser, upsertTrip]);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-main">{isAr ? 'قائمة الرحلات' : 'Trip Queue'}</h1>
                <p className="text-sm text-text-subtle mt-1">{isAr ? `${queueTrips.length} رحلة نشطة` : `${queueTrips.length} active trips`}</p>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
                {['ALL', ...ACTIVE_STATUSES].map(s => {
                    const isActive = statusFilter === s;
                    const color = s === 'ALL' ? { solidBg: 'bg-primary-600 text-white border-primary-600' } : getTripStatusColor(s);
                    return (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${isActive
                                ? `${color.solidBg} shadow-md`
                                : 'bg-surface border-transparent text-text-subtle hover:text-text-main'
                                }`}
                        >
                            {s === 'ALL' ? (isAr ? 'الكل' : 'All') : formatTripStatus(s, isAr)}
                        </button>
                    );
                })}
            </div>

            {/* Trip Cards and Map */}
            {queueTrips.length === 0 ? (
                <Card className="p-12 text-center !rounded-2xl">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
                    <p className="text-lg font-bold text-text-main">{isAr ? 'لا توجد رحلات في الانتظار' : 'Queue is clear!'}</p>
                    <p className="text-sm text-text-subtle mt-1">{isAr ? 'سيظهر هنا أي طلب جديد' : 'New requests will appear here'}</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                    {/* List View */}
                    <div className="xl:col-span-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <AnimatePresence>
                            {queueTrips.map((trip, i) => {
                                const statusColor = getTripStatusColor(trip.status);
                                const PriorityIcon = PRIORITY_ICONS[trip.priority || 'NORMAL'] || Minus;
                                const priorityColor = getTripPriorityColor(trip.priority || 'NORMAL');
                                return (
                                    <motion.div
                                        key={trip.trip_id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card className="p-5 !rounded-2xl space-y-4 hover:shadow-lg transition-shadow">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${priorityColor.bg} ${priorityColor.text}`}>
                                                        <PriorityIcon size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-text-main truncate">{getProjectName(trip.project_id)}</p>
                                                        <p className="text-[11px] text-text-subtle font-bold">{trip.trip_id} • {getServiceName(trip.service_id)}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}>
                                                    {formatTripStatus(trip.status, isAr)}
                                                </span>
                                            </div>

                                            {/* Info Row */}
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div className="bg-surface-subtle rounded-lg p-2 text-center">
                                                    <p className="text-text-subtle font-bold">{isAr ? 'التاريخ' : 'Date'}</p>
                                                    <p className="font-bold text-text-main">{trip.date}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-lg p-2 text-center">
                                                    <p className="text-text-subtle font-bold">{isAr ? 'الوقت' : 'Time'}</p>
                                                    <p className="font-bold text-text-main">{trip.preferred_time || trip.time || '—'}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-lg p-2 text-center">
                                                    <p className="text-text-subtle font-bold">{isAr ? 'الكمية' : 'Qty'}</p>
                                                    <p className="font-bold text-text-main">{trip.quantity || '?'} {trip.unit}</p>
                                                </div>
                                            </div>

                                            {/* Client Photo & GPS */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {trip.request_container_image && (
                                                    <div className="flex items-center gap-2 text-xs text-text-subtle">
                                                        <Camera size={14} />
                                                        <img src={resolveImagePath(trip.request_container_image)} alt="" className="w-8 h-8 rounded-md object-cover border border-border" />
                                                    </div>
                                                )}
                                                {trip.request_location_url && (
                                                    <a href={trip.request_location_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-500 font-bold hover:underline">
                                                        <MapPin size={12} /> {isAr ? 'الموقع' : 'Location'}
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                                {trip.driver_id && (
                                                    <span className="text-xs text-text-subtle font-bold bg-surface-subtle px-2 py-1 rounded-md">
                                                        <UserCheck size={12} className="inline mr-1" />
                                                        {getDriverName(trip.driver_id)}
                                                    </span>
                                                )}
                                                {trip.vehicle_id && (
                                                    <span className="text-xs text-text-subtle font-bold bg-surface-subtle px-2 py-1 rounded-md">
                                                        <Truck size={12} className="inline mr-1" />
                                                        {getVehiclePlate(trip.vehicle_id)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {trip.status === TripStatus.REQUESTED && (
                                                <button
                                                    onClick={() => setAssignModal(trip)}
                                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                                                >
                                                    <UserCheck size={16} /> {isAr ? 'تعيين سائق ومركبة' : 'Assign Driver & Vehicle'}
                                                </button>
                                            )}

                                            {/* Approvment Button instead of Dropdown */}
                                            {isSuperUser && (trip.status === TripStatus.PENDING_APPROVAL || trip.status === TripStatus.PENDING_REVIEW) && (
                                                <Button
                                                    variant="primary"
                                                    disabled={isSubmitting}
                                                    onClick={() => setSignatureModalTrip({ trip, signer: trip.status === TripStatus.PENDING_APPROVAL ? 'CLIENT' : 'GCM' })}
                                                    className="w-full text-xs py-2 bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-md shadow-emerald-500/20"
                                                >
                                                    {isAr ? 'اعتماد الرحلة' : 'Approve Trip'}
                                                </Button>
                                            )}

                                            {trip.issue_notes && (
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl flex items-start gap-2 text-xs font-bold">
                                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {trip.issue_notes}
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Map View */}
                    <div className="xl:col-span-2 bg-surface-subtle rounded-3xl overflow-hidden relative border-4 border-surface shadow-xl shadow-black/5 z-0 min-h-[400px]">
                        <MapContainer
                                                center={firstMarker ? firstMarker.coords : defaultCenter}
                            zoom={10}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {mapMarkers.map((marker) => (
                                <Marker
                                    key={marker.id}
                                    position={marker.coords}
                                >
                                    <Popup>
                                        <div className="text-right flex flex-col items-end">
                                            <h4 className="font-bold text-slate-800 m-0">{marker.project}</h4>
                                            <p className="text-[10px] text-primary-600 font-bold m-0 uppercase opacity-70">#{marker.id}</p>
                                            <div className="mt-2 text-[11px] font-bold text-slate-500">
                                                {formatTripStatus(marker.status, isAr)}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            <MapAutoCenter coords={mapMarkers.map(m => m.coords)} />
                        </MapContainer>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedDriver(''); setSelectedVehicle(''); }} title={isAr ? 'تعيين سائق ومركبة' : 'Assign Driver & Vehicle'} size="md">
                <div className="p-4 space-y-6">
                    {assignModal && (
                        <div className="bg-surface-subtle rounded-xl p-4 space-y-1 border border-border">
                            <p className="font-bold text-text-main">{getProjectName(assignModal.project_id)}</p>
                            <p className="text-xs text-text-subtle font-bold">{assignModal.trip_id} • {assignModal.date} • {assignModal.preferred_time || '—'}</p>
                            {assignModal.priority && (
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${getTripPriorityColor(assignModal.priority).bg} ${getTripPriorityColor(assignModal.priority).text}`}>
                                    {assignModal.priority}
                                </span>
                            )}
                        </div>
                    )}

                    <Select
                        label={isAr ? 'السائق' : 'Driver'}
                        icon={UserCheck}
                        value={selectedDriver}
                        onChange={val => setSelectedDriver(val)}
                        options={drivers.filter(d => d.status === 'ACTIVE').map(d => ({ label: d.name, value: d.driver_id }))}
                        placeholder={isAr ? '--- اختر السائق ---' : '--- Select Driver ---'}
                    />

                    <Select
                        label={isAr ? 'المركبة' : 'Vehicle'}
                        icon={Truck}
                        value={selectedVehicle}
                        onChange={val => setSelectedVehicle(val)}
                        options={vehicles.filter(v => v.status === 'ACTIVE').map(v => ({ label: `${v.plate_no} (${v.vehicle_type})`, value: v.vehicle_id }))}
                        placeholder={isAr ? '--- اختر المركبة ---' : '--- Select Vehicle ---'}
                    />

                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => { setAssignModal(null); setSelectedDriver(''); setSelectedVehicle(''); }}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 py-4"
                            disabled={!selectedDriver || !selectedVehicle || isSubmitting}
                            onClick={handleAssign}
                            icon={CheckCircle2}
                        >
                            {isSubmitting ? (isAr ? 'جاري التعيين...' : 'Assigning...') : (isAr ? 'تأكيد التعيين' : 'Confirm Assignment')}
                        </Button>
                    </div>
                </div>
            </Modal>

            <SignatureApproveModal
                isOpen={!!signatureModalTrip}
                trip={signatureModalTrip?.trip || null}
                {...(signatureModalTrip?.signer ? { intendedSigner: signatureModalTrip.signer } : {})}
                onClose={() => setSignatureModalTrip(null)}
                onApproveSuccess={() => setSignatureModalTrip(null)}
            />
        </div>
    );
};

export default TripQueue;
