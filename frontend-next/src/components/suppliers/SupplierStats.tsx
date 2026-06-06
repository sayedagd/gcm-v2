import React from 'react';
import { Building2, CheckCircle2, LayoutGrid, Truck } from 'lucide-react';
import { StatCard } from '@/components';

interface SupplierStatsProps {
    stats: {
        total: number;
        active: number;
        categories: number;
        assets: number;
    };
    isAr: boolean;
}

const SupplierStats: React.FC<SupplierStatsProps> = ({ stats, isAr }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title={isAr ? 'إجمالي الشركاء' : 'TOTAL PARTNERS'}
                value={stats.total}
                icon={Building2}
                variant="amber"
            />
            <StatCard
                title={isAr ? 'الشركاء النشطون' : 'ACTIVE NETWORK'}
                value={stats.active}
                icon={CheckCircle2}
                variant="emerald"
            />
            <StatCard
                title={isAr ? 'الفئات التشغيلية' : 'SERVICE CLASSES'}
                value={stats.categories}
                icon={LayoutGrid}
                variant="blue"
            />
            <StatCard
                title={isAr ? 'الأصول التابعة' : 'MANAGED ASSETS'}
                value={stats.assets}
                icon={Truck}
                variant="purple"
            />
        </div>
    );
};

export default SupplierStats;
