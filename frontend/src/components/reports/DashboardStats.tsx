import React from 'react';
import { AlertCircle, Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardStatsProps {
    stats: {
        pendingCount: number;
        inProgressCount: number;
        completedCount: number;
        totalTonnage: number;
        pendingTonnage: number;
    };
    isAr: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title={t('analytics.stats.pendingReview')}
                value={stats.pendingCount}
                icon={AlertCircle}
                trend={stats.pendingCount > 5 ? 12 : undefined}
                variant="purple"
                description={t('analytics.stats.pendingReviewDesc')}
            />
            <StatCard
                title={t('analytics.stats.pendingTonnage')}
                value={stats.pendingTonnage.toFixed(1)}
                icon={Activity}
                variant="amber"
                description={t('analytics.stats.pendingTonnageDesc')}
            />
            <StatCard
                title={t('analytics.stats.completedTrips')}
                value={stats.completedCount}
                icon={CheckCircle2}
                variant="emerald"
                trend={5}
            />
            <StatCard
                title={t('analytics.stats.totalTonnage')}
                value={stats.totalTonnage.toFixed(0)}
                icon={TrendingUp}
                variant="blue"
            />
        </div>
    );
};

export default DashboardStats;
