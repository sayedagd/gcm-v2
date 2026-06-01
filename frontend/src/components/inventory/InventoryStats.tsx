import React from 'react';
import { Container as SkipIcon, CheckCircle2, Droplet, Activity } from 'lucide-react';
import { StatCard } from '@/components';

interface InventoryStatsProps {
    globalStats: {
        totalBins: number;
        activeBins: number;
        totalTanks: number;
        activeTanks: number;
    };
    isAr: boolean;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ globalStats, isAr }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                title={isAr ? 'إجمالي الحاويات' : 'BIN CAPCITY'}
                value={globalStats.totalBins}
                icon={SkipIcon}
                variant="blue"
            />
            <StatCard
                title={isAr ? 'حاويات نشطة' : 'ACTIVE SKIPS'}
                value={globalStats.activeBins}
                icon={CheckCircle2}
                variant="emerald"
            />
            <StatCard
                title={isAr ? 'إجمالي الصهاريج' : 'FLUID TANKS'}
                value={globalStats.totalTanks}
                icon={Droplet}
                variant="blue"
            />
            <StatCard
                title={isAr ? 'صهاريج نشطة' : 'ACTIVE TANKS'}
                value={globalStats.activeTanks}
                icon={Activity}
                variant="rose"
            />
        </div>
    );
};

export default InventoryStats;
