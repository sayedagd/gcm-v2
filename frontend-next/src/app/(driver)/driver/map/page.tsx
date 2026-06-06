"use client";

import React, { useMemo, useState } from 'react';
import { useStore } from '@/context';
import { TripStatus } from '@/types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { extractCoordinates, formatDate } from '@/utils/helpers';
import { Card } from '@/components';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { MapPin, Calendar, Truck, Navigation, ChevronLeft, ChevronRight, Activity, Filter } from 'lucide-react';
import { isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

// Fix for default marker icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const DriverMapView: React.FC = () => {
    const { saasConfig, trips, projects, currentUser } = useStore();
    const { projectMap } = useLookupMaps();
    const isAr = saasConfig.language === 'ar';
    const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('TODAY');

    const filteredTrips = useMemo(() => {
        const now = new Date();
        let interval = { start: startOfDay(now), end: endOfDay(now) };

        if (period === 'WEEK') interval = { start: startOfWeek(now), end: endOfWeek(now) };
        if (period === 'MONTH') interval = { start: startOfMonth(now), end: endOfMonth(now) };
        if (period === 'YEAR') interval = { start: startOfYear(now), end: endOfYear(now) };

        return trips.filter(t => {
            if (!t.date) return false;
            try {
                const tripDate = parseISO(t.date);
                return isWithinInterval(tripDate, interval);
            } catch {
                return false;
            }
        });
    }, [trips, period]);

    const points = useMemo(() => {
        return filteredTrips.flatMap(t => {
            const coords = extractCoordinates(t.trip_location_url || t.request_location_url);
            if (!coords) return [];

            return [{
                coords,
                trip: t,
                project: projectMap[t.project_id]?.project_name || t.project_id
            }];
        });
    }, [filteredTrips, projectMap]);

    const center: [number, number] = points[0]?.coords ?? [24.7136, 46.6753];

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] -mx-4 -mt-6 relative">
            {/* Overlay Header Filters */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3">
                <div className="flex bg-surface/90 backdrop-blur-md p-1 rounded-2xl border border-border shadow-2xl overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {(['TODAY', 'WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-primary text-white shadow-lg' : 'text-text-subtle hover:text-primary'}`}
                        >
                            {p === 'TODAY' ? (isAr ? 'اليوم' : 'Today') : 
                             p === 'WEEK' ? (isAr ? 'الأسبوع' : 'Week') : 
                             p === 'MONTH' ? (isAr ? 'الشهر' : 'Month') : 
                             (isAr ? 'السنة' : 'Year')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map Engine */}
            <div className="flex-1 w-full bg-surface-subtle">
                <MapContainer
                    center={center}
                    zoom={12}
                    className="h-full w-full"
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {points.map((p, idx) => (
                        <Marker key={`${p.trip.trip_id}-${idx}`} position={p.coords} icon={DefaultIcon}>
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[150px]">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{p.project}</p>
                                    <p className="text-xs font-bold text-text-main py-1 border-y border-border/50 my-1">
                                        {p.trip.quantity} {p.trip.unit}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 opacity-60">
                                        <Calendar size={10} />
                                        <span className="text-[9px] font-bold">{p.trip.date}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Site Summary Card */}
            <div className="absolute bottom-6 left-4 right-4 z-[1000]">
                <Card className="p-4 !rounded-[2.5rem] bg-surface/90 backdrop-blur-xl border border-border/50 shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Navigation size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">{isAr ? 'المواقع المكتشفة' : 'Sites Visualized'}</p>
                            <p className="text-xl font-black text-text-main">{points.length} <span className="text-xs text-text-subtle">{isAr ? 'نقطة سجل' : 'Data Points'}</span></p>
                        </div>
                    </div>
                    <div className="h-10 w-[1px] bg-border mx-4" />
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">{isAr ? 'التغطية' : 'Coverage'}</p>
                        <p className="text-xl font-black text-emerald-500">{Math.min(100, points.length * 5)}%</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default DriverMapView;
