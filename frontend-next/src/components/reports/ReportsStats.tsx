import React from 'react';
import { AlertCircle, Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components';

interface ReportsStatsProps {
    stats: {
        pendingCount: number;
        pendingTonnage: number;
        completedCount: number;
        totalTonnage: number;
    };
    isAr: boolean;
}

const ReportsStats: React.FC<ReportsStatsProps> = ({ stats, isAr }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
            <StatCard
                title={isAr ? 'في انتظار المراجعة' : 'Pending Review'}
                value={stats.pendingCount}
                icon={AlertCircle}
                variant="purple"
                description={isAr ? 'رحلات تحتاج اعتماد' : 'Trips awaiting approval'}
            />
            <StatCard
                title={isAr ? 'الأوزان المعلقة (طن)' : 'Pending Tonnage'}
                value={stats.pendingTonnage.toFixed(1)}
                icon={Activity}
                variant="amber"
                description={isAr ? 'إجمالي وزن المراجعة' : 'Total tonnage in review'}
            />
            <StatCard
                title={isAr ? 'الرحلات المكتملة' : 'Completed Trips'}
                value={stats.completedCount}
                icon={CheckCircle2}
                variant="emerald"
            />
            <StatCard
                title={isAr ? 'إجمالي الأوزان' : 'Total Tonnage'}
                value={stats.totalTonnage.toFixed(0)}
                icon={TrendingUp}
                variant="blue"
            />
        </div>
    );
};

export default ReportsStats;
