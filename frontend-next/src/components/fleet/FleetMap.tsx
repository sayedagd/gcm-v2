"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Vehicle } from '@/types';
import Card from '@/components/ui/Card';
import { Truck, Navigation, Search } from 'lucide-react';
import Input from '@/components/ui/Input';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

// Create custom icons based on vehicle status
const createCustomIcon = (leaflet: typeof import('leaflet'), status: string) => {
    let color = '#3b82f6'; // Default blue
    if (status === 'ACTIVE') color = '#10b981'; // Emerald
    if (status === 'INACTIVE') color = '#ef4444'; // Rose

    const markerHtmlStyles = `
        background-color: ${color};
        width: 30px;
        height: 30px;
        display: block;
        left: -15px;
        top: -15px;
        position: relative;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    `;

    return leaflet.divIcon({
        className: "custom-pin",
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}"></span>`
    });
};


interface FleetMapProps {
    vehicles: Vehicle[];
    isAr: boolean;
}

const FleetMap: React.FC<FleetMapProps> = ({ vehicles, isAr }) => {
    const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);
    const center: [number, number] = [23.8859, 45.0792]; // Saudi Arabia center roughly
    const defaultZoom = 5;

    // Default static mock location
    const defaultLocation: [number, number] = [24.7136, 46.6753]; // Riyadh

    const [mapSearch, setMapSearch] = useState('');
    const [mockPositions, setMockPositions] = useState<Record<string, [number, number]>>({});

    useEffect(() => {
        let mounted = true;
        import('leaflet').then((module) => {
            if (!mounted) {
                return;
            }

            const L = (module.default ?? module) as typeof import('leaflet');
            const iconDefaultPrototype = L.Icon.Default.prototype as { _getIconUrl?: unknown };
            delete iconDefaultPrototype._getIconUrl;

            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });

            setLeaflet(L);
        });

        return () => {
            mounted = false;
        };
    }, []);

    // Initialize mock positions
    useEffect(() => {
        const positions: Record<string, [number, number]> = {};
        vehicles.forEach((v, i) => {
            // Create a slight spread around Riyadh for demo purposes
            positions[v.vehicle_id] = [
                defaultLocation[0] + (Math.random() - 0.5) * 5,
                defaultLocation[1] + (Math.random() - 0.5) * 5
            ];
        });
        setMockPositions(positions);
    }, [vehicles]);


    const filteredVehicles = vehicles.filter(v =>
        v.plate_no.toLowerCase().includes(mapSearch.toLowerCase()) ||
        v.vehicle_id.toLowerCase().includes(mapSearch.toLowerCase())
    );

    return (
        <Card className="p-0 overflow-hidden bg-surface border-2 border-border rounded-[2.5rem] shadow-sm relative h-[600px] flex flex-col">
            <div className="absolute top-6 left-6 z-[400] bg-surface/90 backdrop-blur-md p-4 rounded-3xl border border-border shadow-2xl flex flex-col gap-4 min-w-[300px]">
                <div className="flex items-center gap-3 text-text-main">
                    <Navigation size={24} className="text-primary-500" />
                    <h3 className="font-black uppercase tracking-widest">{isAr ? 'القيادة والتحكم' : 'Command & Control'}</h3>
                </div>

                <Input
                    placeholder={isAr ? 'ابحث عن وحدة...' : 'Search unit...'}
                    icon={Search}
                    value={mapSearch}
                    onChange={setMapSearch}
                    className="!rounded-2xl shadow-sm bg-surface"
                />

                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest mt-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {vehicles.filter(v => v.status === 'ACTIVE').length} {isAr ? 'نشط' : 'Active'}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        {vehicles.filter(v => v.status === 'INACTIVE').length} {isAr ? 'متوقف' : 'Inactive'}
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full relative z-[1]">
                {leaflet ? (
                    <MapContainer center={center} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&amp;copy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />

                        {filteredVehicles.map(vehicle => {
                            const position = mockPositions[vehicle.vehicle_id] || defaultLocation;
                            return (
                                <Marker
                                    key={vehicle.vehicle_id}
                                    position={position}
                                    icon={createCustomIcon(leaflet, vehicle.status)}
                                >
                                    <Popup className="fleet-popup rounded-3xl overflow-hidden border-0">
                                        <div className="p-3">
                                            <div className="flex items-center gap-3 mb-3 border-b border-border pb-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-text-subtle uppercase tracking-widest">{vehicle.vehicle_id}</div>
                                                    <div className="text-sm font-black text-text-main">{vehicle.plate_no}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-surface-subtle p-2 rounded-xl text-center">
                                                    <span className="block text-[8px] font-bold text-text-subtle uppercase mb-1">Type</span>
                                                    <span className="font-black text-text-main">{vehicle.vehicle_type}</span>
                                                </div>
                                                <div className="bg-surface-subtle p-2 rounded-xl text-center">
                                                    <span className="block text-[8px] font-bold text-text-subtle uppercase mb-1">Status</span>
                                                    <span className={`font-black ${vehicle.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>{vehicle.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-text-subtle bg-surface-subtle">
                        {isAr ? 'تحميل الخريطة...' : 'Loading map...'}
                    </div>
                )}
            </div>

            {/* Global Map Styles Override */}
            <style>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 1.5rem;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                }
                .leaflet-popup-content {
                    margin: 0;
                }
                .leaflet-popup-tip-container {
                     margin-top: -1px;
                }
            `}</style>
        </Card>
    );
};

export default FleetMap;
