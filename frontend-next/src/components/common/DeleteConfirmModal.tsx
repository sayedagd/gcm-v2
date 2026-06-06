import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal, Button } from '@/components';
import { motion } from 'framer-motion';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    itemName?: string | undefined;
    isAr?: boolean;
    isLoading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
    isAr = false,
    isLoading = false
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            isAr={isAr}
            footer={
                <div className={`flex items-center gap-3 w-full ${isAr ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        isLoading={isLoading}
                        icon={Trash2}
                        className="flex-1 shadow-lg shadow-rose-500/20"
                    >
                        {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 shadow-inner"
                >
                    <AlertTriangle size={32} />
                </motion.div>

                <div className="space-y-2">
                    <p className="text-sm text-text-subtle leading-relaxed">
                        {message}
                    </p>
                    {itemName && (
                        <p className="text-base font-black text-text-main uppercase tracking-tight">
                            "{itemName}"
                        </p>
                    )}
                </div>

                <div className="w-full p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <AlertTriangle size={12} />
                        {isAr ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
