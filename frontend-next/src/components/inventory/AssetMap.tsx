import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip } from '@/types';
import { extractCoordinates } from '@/utils/helpers';

// Fix for default marker icons in Leaflet with Vite
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ActiveIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface AssetMapProps {
    history: Trip[];
    isAr: boolean;
}

const AssetMap: React.FC<AssetMapProps> = ({ history, isAr }) => {
    const points = useMemo(() => {
        return history
            .map(t => ({
                coords: extractCoordinates(t.trip_location_url),
                date: t.date,
                id: t.trip_id,
                isLast: false // We'll set this below
            }))
            .filter(p => p.coords !== null) as { coords: [number, number]; date: string; id: string; isLast: boolean }[];
    }, [history]);

    const firstPoint = points[0];
    if (firstPoint) {
        firstPoint.isLast = true; // Most recent trip
    }

    const center = firstPoint ? firstPoint.coords : [24.7136, 46.6753] as [number, number];

    return (
        <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-border mt-4 z-0">
            <MapContainer
                center={center}
                zoom={11}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {points.map((p, idx) => (
                    <Marker
                        key={p.id}
                        position={p.coords}
                        icon={p.isLast ? ActiveIcon : DefaultIcon}
                    >
                        <Popup>
                            <div className="text-xs font-bold leading-tight">
                                <p className="text-primary mb-1">{p.isLast ? (isAr ? 'الموقع الحالي' : 'Current/Last Location') : (isAr ? 'موقع سابق' : 'Previous Location')}</p>
                                <p className="text-text-main">{p.date}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default AssetMap;
