import React from 'react';
import { Users, Activity, Key, UserCog, MapPin } from 'lucide-react';
import { StatCard } from '@/components';

interface UserStatsProps {
    stats: {
        totalUsers: number;
        onlineUsers: number;
        pendingRequests: number;
        admins: number;
        totalTrips: number;
    };
    t: {
        stats: {
            total: string;
            online: string;
            pending: string;
            admins: string;
            trips: string;
        }
    };
}

const UserStats: React.FC<UserStatsProps> = ({ stats, t }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
            <StatCard title={t.stats.total} value={stats.totalUsers} icon={Users} variant="blue" />
            <StatCard title={t.stats.online} value={stats.onlineUsers} icon={Activity} variant="emerald" />
            <StatCard title={t.stats.pending} value={stats.pendingRequests} icon={Key} variant="amber" />
            <StatCard title={t.stats.admins} value={stats.admins} icon={UserCog} variant="purple" />
            <StatCard title={t.stats.trips} value={stats.totalTrips} icon={MapPin} variant="blue" />
        </div>
    );
};

export default UserStats;
