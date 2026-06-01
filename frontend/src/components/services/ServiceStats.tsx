import React from 'react';
import { Box, Layers, Zap } from 'lucide-react';
import { StatCard } from '@/components';

interface ServiceStatsProps {
    stats: {
        total: number;
        categories: number;
        materials: number;
    };
    isAr: boolean;
}

const ServiceStats: React.FC<ServiceStatsProps> = ({ stats, isAr }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
                title={isAr ? 'إجمالي العناصر' : 'Total Items'}
                value={stats.total}
                icon={Box}
                variant="blue"
            />
            <StatCard
                title={isAr ? 'التصنيفات' : 'Categories'}
                value={stats.categories}
                icon={Layers}
                variant="purple"
            />
            <StatCard
                title={isAr ? 'المواد والخدمات' : 'Materials & Services'}
                value={stats.materials}
                icon={Zap}
                variant="emerald"
            />
        </div>
    );
};

export default ServiceStats;
