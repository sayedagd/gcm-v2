import React from 'react';
import { Vehicle, VehicleDocument, DocumentStatus } from '@/types';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VehicleProgressProps {
    vehicle: Partial<Vehicle>;
    isAr: boolean;
    className?: string;
    showDetails?: boolean;
}

export const calculateVehicleProgress = (documents?: any) => {
    // Defensive check: handle non-array inputs (like strings or null)
    let docs: any[] = [];
    if (Array.isArray(documents)) {
        docs = documents;
    } else if (typeof documents === 'string') {
        try {
            const parsed = JSON.parse(documents);
            docs = Array.isArray(parsed) ? parsed : [];
        } catch {
            docs = [];
        }
    }

    if (docs.length === 0) return 0;

    const totalWeight = docs.reduce((sum, doc) => sum + (doc.progress_weight || 0), 0);
    if (totalWeight === 0) return 0;

    const currentScore = docs.reduce((score, doc) => {
        // Only ACTIVE or NEAR_EXPIRY docs contribute to readiness
        if (doc.status === 'ACTIVE' || doc.status === 'NEAR_EXPIRY') {
            return score + (doc.progress_weight || 0);
        }
        return score;
    }, 0);

    // Normalize to 100 max
    return Math.min(100, Math.round((currentScore / totalWeight) * 100));
};

export const getDocumentStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
        case 'NEAR_EXPIRY':
            return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
        case 'EXPIRED':
            return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
        default:
            return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
    }
};

export const getDocumentStatusIcon = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return <CheckCircle2 size={16} className="text-emerald-500" />;
        case 'NEAR_EXPIRY':
            return <AlertTriangle size={16} className="text-amber-500" />;
        case 'EXPIRED':
            return <AlertCircle size={16} className="text-rose-500" />;
        default:
            return <AlertCircle size={16} className="text-slate-500" />;
    }
};

const VehicleProgress: React.FC<VehicleProgressProps> = ({ vehicle, isAr, className = '', showDetails = false }) => {
    // Defensive check for documents
    let documents: any[] = [];
    if (Array.isArray(vehicle?.documents)) {
        documents = vehicle.documents;
    } else if (typeof vehicle?.documents === 'string') {
        try {
            const parsed = JSON.parse(vehicle.documents);
            documents = Array.isArray(parsed) ? parsed : [];
        } catch {
            documents = [];
        }
    }
    const progress = calculateVehicleProgress(documents);

    // Determine global color based on progress
    const getProgressColor = (p: number) => {
        if (p === 100) return 'bg-emerald-500';
        if (p >= 50) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const getProgressBgColor = (p: number) => {
        if (p === 100) return 'bg-emerald-100 dark:bg-emerald-900/20';
        if (p >= 50) return 'bg-amber-100 dark:bg-amber-900/20';
        return 'bg-rose-100 dark:bg-rose-900/20';
    };

    const getProgressTextColor = (p: number) => {
        if (p === 100) return 'text-emerald-600 dark:text-emerald-400';
        if (p >= 50) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                    {isAr ? 'نسبة الجاهزية' : 'Readiness'}
                </span>
                <span className={`text-sm font-bold ${getProgressTextColor(progress)}`}>
                    {progress}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className={`h-2 w-full rounded-full overflow-hidden ${getProgressBgColor(progress)}`}>
                <div
                    className={`h-full transition-all duration-1000 ease-out ${getProgressColor(progress)}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Document status pills */}
            {showDetails && documents.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                    {documents.map((doc, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold border border-transparent 
                 ${doc.status === DocumentStatus.EXPIRED ? 'border-rose-200 dark:border-rose-800' : ''} ${getDocumentStatusColor(doc.status)}`}
                            title={`${doc.type} - ${doc.number}`}
                        >
                            {getDocumentStatusIcon(doc.status)}
                            <span className="truncate max-w-[80px]">{isAr && doc.type === 'Registration Card' ? 'استمارة' : doc.type.split(' ')[0]}</span>
                        </div>
                    ))}
                </div>
            )}

            {documents.length === 0 && (
                <p className="text-[10px] text-text-subtle italic">
                    {isAr ? 'لا توجد مستندات مرفقة' : 'No documents attached'}
                </p>
            )}
        </div>
    );
};

export default VehicleProgress;
