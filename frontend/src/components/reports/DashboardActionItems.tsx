import React from 'react';
import { AlertCircle, Building2, Activity, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils/helpers';
import { useTranslation } from '@/hooks/useTranslation';
import { Trip, Project, TripStatus } from '@/types';

interface DashboardActionItemsProps {
    trips: Trip[];
    projects: Project[];
    isAr: boolean;
    onAction: (trip: Trip, step: number, warnings: string[]) => void;
}

const DashboardActionItems: React.FC<DashboardActionItemsProps> = ({ trips, projects, isAr, onAction }) => {
    const { t } = useTranslation();
    const pendingTrips = trips.filter(t => t.status === TripStatus.PENDING_REVIEW || t.status === TripStatus.PENDING_DOCS);

    const handleItemClick = (trip: Trip) => {
        const warnings: string[] = [];
        let initialStep = 1;

        // Check for missing items to determine deep link step
        if (!trip.quantity || Number(trip.quantity) === 0) {
            warnings.push(isAr ? 'يرجى إدخال الوزن' : 'Weight/Quantity is missing');
            initialStep = 3;
        }

        if (!trip.service_id) {
            warnings.push(isAr ? 'يرجى تحديد نوع الخدمة' : 'Service type is missing');
            if (initialStep < 3) initialStep = 3;
        }

        const missingDocs = [];
        if (!trip.waste_manifest_no && !trip.manifest_file) missingDocs.push(t('wizard.steps.documents') + ' (Manifest)');
        if (!trip.delivery_note_no && !trip.delivery_note_file) missingDocs.push(t('wizard.steps.documents') + ' (Delivery Note)');

        if (missingDocs.length > 0) {
            warnings.push(`${isAr ? 'نواقص المستندات: ' : 'Missing Docs: '}${missingDocs.join(', ')}`);
            // Prioritize Step 4 only if weight is present, otherwise stick to 3
            if (initialStep < 4 && trip.quantity) initialStep = 4;
        }

        onAction(trip, initialStep, warnings);
    };

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                <AlertCircle size={20} className="text-primary" />
                {isAr ? 'تنبيهات المراجعة العاجلة' : 'Action Required'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingTrips.slice(0, 6).map(trip => {
                    const project = projects.find(p => p.project_id === trip.project_id);
                    return (
                        <motion.div
                            key={trip.trip_id}
                            layout
                            onClick={() => handleItemClick(trip)}
                            className="bg-surface p-6 rounded-2xl border-l-4 border-primary shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-text-subtle opacity-50 uppercase tracking-widest">{trip.trip_id}</span>
                                    <h4 className="font-bold text-text-main">{formatDate(trip.date)}</h4>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${trip.status === TripStatus.PENDING_DOCS ? 'bg-amber-muted text-amber' : 'bg-primary/10 text-primary'}`}>
                                    {trip.status === TripStatus.PENDING_DOCS ? (isAr ? 'نقص مستندات' : 'Missing Docs') : (isAr ? 'مراجعة' : 'Review')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-text-subtle">
                                    <Building2 size={16} />
                                    <span className="truncate">{project?.project_name || '---'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-text-subtle">
                                    <Activity size={16} />
                                    <span>{trip.quantity} {trip.unit}</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                {pendingTrips.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-surface-subtle rounded-2xl border border-dashed border-border">
                        <CheckCircle2 size={40} className="mx-auto text-success mb-4" />
                        <p className="text-text-subtle font-bold">{isAr ? 'لا توجد رحلات معلقة' : 'No trips pending review'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardActionItems;
