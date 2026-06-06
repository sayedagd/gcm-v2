import React from 'react';
import { Globe } from 'lucide-react';
import { Card } from '@/components';

interface LogisticsMapProps {
    activeProjectsCount: number;
    isAr: boolean;
    darkMode: boolean;
}

const LogisticsMap: React.FC<LogisticsMapProps> = React.memo(({ activeProjectsCount, isAr, darkMode }) => {
    return (
        <Card className="relative h-full bg-slate-900 border-none overflow-hidden group shadow-lg">
            <div className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-700">
                <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    title="map"
                    style={{
                        filter: darkMode
                            ? 'grayscale(100%) invert(92%) contrast(83%)'
                            : 'none',
                        pointerEvents: 'none' // Prevent capturing scroll
                    }}
                    src="https://maps.google.com/maps?q=Riyadh&z=10&output=embed"
                ></iframe>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full p-8 justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-md">
                        <Globe size={18} className="text-blue-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">{isAr ? 'خارطة التوسع' : 'Expansion Map'}</span>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-4xl font-bold text-white tracking-tight">{activeProjectsCount}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{isAr ? 'مواقع نشطة' : 'Active Projects'}</p>
                    </div>
                    <div className="flex gap-1.5 mb-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-50" />
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
});

export default LogisticsMap;
