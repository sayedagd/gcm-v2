import React from 'react';
import { Building2, Briefcase, Truck, Users, AlertCircle, Zap, Box, Handshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import StatCard from '../ui/StatCard';
import { formatNumber } from '../../utils/helpers';
import { useStore } from '../../context';
import { Role } from '../../types';

interface StatsGridProps {
    isAr: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ isAr }) => {
    const { companies, projects, trips, vehicles, drivers, containers, currentUser, contactSubmissions, suppliers } = useStore();


    const isFinance = currentUser.role === Role.ACCOUNTANT;
    const isAdmin = currentUser.role === Role.ADMIN;

    const activeTrips = trips.filter(t => t.status !== 'CANCELLED').length;
    const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE').length;
    const activeDrivers = drivers.filter(d => d.status === 'ACTIVE').length;
    const availableContainers = containers.filter(c => c.status === 'AVAILABLE').length;

    // Route Mapping: /t (Trips), /c (Companies), /p (Projects), /f (Fleet), /dr (Drivers), /iv (Inventory), /sup (Suppliers), /le (Inquiries)

    const stats = [
        {
            label: isAr ? 'العمليات النشطة' : 'Active Ops',
            description: isAr ? 'إجمالي الرحلات المسجلة في النظام اليوم' : 'Total trips processed in the current session.',
            value: formatNumber(activeTrips),
            icon: Truck,
            visible: true,
            delay: 0.1,
            path: '/t',
            variant: 'emerald'
        },
        {
            label: isAr ? 'الشركات المتعاقدة' : 'Partner Network',
            description: isAr ? 'الشركات التي لديها عقود نشطة حالياً' : 'Active B2B contracts and partnerships.',
            value: formatNumber(companies.length),
            icon: Building2,
            visible: true,
            delay: 0.2,
            path: '/c',
            variant: 'blue'
        },
        {
            label: isAr ? 'المشاريع الجارية' : 'Projects Live',
            description: isAr ? 'مواقع العمل النشطة في جميع المناطق' : 'Active job sites across all regions.',
            value: formatNumber(projects.length),
            icon: Briefcase,
            visible: true,
            delay: 0.3,
            path: '/p',
            variant: 'purple'
        },
        {
            label: isAr ? 'جاهزية الأسطول' : 'Fleet Status',
            description: isAr ? 'نسبة المركبات الجاهزة للعمل فوراً' : 'Vehicles ready for immediate deployment.',
            value: `${activeVehicles}/${vehicles.length}`,
            icon: Zap,
            visible: !isFinance,
            delay: 0.4,
            path: '/f',
            variant: 'amber'
        },
        {
            label: isAr ? 'القوى العاملة' : 'Workforce',
            description: isAr ? 'السائقين والمشرفين المتاحين حالياً' : 'Drivers and field supervisors on duty.',
            value: `${activeDrivers}/${drivers.length}`,
            icon: Users,
            visible: !isFinance,
            delay: 0.5,
            path: '/dr',
            variant: 'indigo'
        },
        {
            label: isAr ? 'المخزون المتوفر' : 'Stock Level',
            description: isAr ? 'الحاويات المتاحة في المخازن الرئيسية' : 'Containers available in central yards.',
            value: formatNumber(availableContainers),
            icon: Box,
            visible: !isFinance,
            delay: 0.6,
            path: '/iv',
            variant: 'cyan'
        },
        {
            label: isAr ? 'الموردين' : 'Suppliers Hub',
            description: isAr ? 'قاعدة بيانات الموردين وشركاء الخدمات' : 'Registered vendors and service providers.',
            value: formatNumber(suppliers ? suppliers.length : 0),
            icon: Handshake,
            visible: !isFinance,
            delay: 0.7,
            path: '/sup',
            variant: 'rose'
        },
        {
            label: isAr ? 'رسائل الموقع' : 'Inquiries',
            description: isAr ? 'الاستفسارات الواردة عبر الموقع الإلكتروني' : 'Web leads and contact form messages.',
            value: formatNumber(contactSubmissions.length),
            icon: AlertCircle,
            visible: isAdmin,
            delay: 0.8,
            path: '/le',
            variant: 'slate'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.filter(s => s.visible).map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: stat.delay, duration: 0.4 }}
                >
                    <Link to={stat.path} className="block h-full focus:outline-none">
                        <StatCard
                            title={stat.label}
                            description={stat.description}
                            value={stat.value}
                            icon={stat.icon}
                            variant={stat.variant as any}
                            className="h-full cursor-pointer hover:shadow-lg transition-all"
                        />
                    </Link>
                </motion.div>
            ))}
        </div>
    );
};
