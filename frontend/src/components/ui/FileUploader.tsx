/**
 * =====================================================
 * [AR] مكون رفع الملفات القابل لإعادة الاستخدام
 * [EN] Reusable File Uploader Component
 * =====================================================
 */

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../../utils/helpers';

interface FileUploaderProps {
    onUpload: (base64: string) => void;
    value?: string;
    isAr: boolean;
    accept?: string;
    maxSize?: number;
    label?: string;
    multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    onUpload,
    value,
    isAr,
    accept = "image/*,application/pdf",
    maxSize = 5 * 1024 * 1024,
    label,
    multiple = false
}) => {
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList | File[]) => {
        try {
            const fileArray = Array.from(files);

            for (const file of fileArray) {
                if (file.type.startsWith('image/')) {
                    const compressed = await compressImage(file);
                    onUpload(compressed);
                } else {
                    if (file.size > maxSize) {
                        setError(isAr ? 'الملف يتجاوز الحد المسموح' : 'File exceeds size limit');
                        continue;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => { onUpload(reader.result as string); setError(''); };
                    reader.readAsDataURL(file);
                }
            }
            setError('');
        } catch {
            setError(isAr ? 'فشل معالجة الملف' : 'Failed to process file');
        }
    };

    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    if (value) {
        return (
            <div className="flex items-center gap-2">
                {value.startsWith('data:image/') && (
                    <img src={value} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-border" />
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span className="text-xs font-medium">{isAr ? 'تم الرفع' : 'Uploaded'}</span>
                </div>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpload(''); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 ms-0.5">
                    {label}
                </label>
            )}

            <input
                type="file"
                ref={fileInputRef}
                accept={accept}
                multiple={multiple}
                onChange={handleInputChange}
                className="hidden"
            />

            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`w-full p-4 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center gap-2 group ${isDragging
                    ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/5'
                    }`}
            >
                <Upload size={20} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isAr ? 'اسحب الملف هنا أو انقر للرفع' : 'Drop file here or click to upload'}
                </span>
            </button>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-rose-500 font-medium ms-0.5"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FileUploader;
