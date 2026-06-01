/**
 * [AR] مكون حوار التأكيد — بديل لـ window.confirm
 * [EN] Confirm Dialog Component — Drop-in replacement for window.confirm
 *
 * Provides both a React component and an imperative API.
 *
 * Component usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title="Delete Trip?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     onConfirm={() => handleDelete()}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 *
 * Hook usage (imperative):
 *   const { confirm, ConfirmDialogRenderer } = useConfirmDialog();
 *   const ok = await confirm({ title: 'Delete?', message: 'Cannot undo.' });
 *   if (ok) deleteItem();
 *   // Render <ConfirmDialogRenderer /> somewhere in JSX
 */
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';
import { useStore } from '@/context';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<Variant, { icon: React.FC<any>; iconBg: string; iconColor: string; btnClass: string }> = {
  danger: { icon: Trash2, iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-500', btnClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-500', btnClass: 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20' },
  info: { icon: HelpCircle, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-500', btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message, confirmLabel, cancelLabel, variant = 'danger', loading = false, onConfirm, onCancel,
}) => {
  const { saasConfig } = useStore();
  const isAr = saasConfig.language === 'ar';
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-surface border border-border rounded-2xl shadow-2xl z-[9991] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${config.iconBg} shrink-0`}>
                  <Icon size={24} className={config.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-text-main mb-1">{title}</h3>
                  <p className="text-sm text-text-subtle leading-relaxed">{message}</p>
                </div>
                <button onClick={onCancel} className="p-1 text-text-subtle hover:text-text-main rounded-lg transition-colors shrink-0">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 bg-surface-subtle/50 border-t border-border">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-text-main font-bold text-sm hover:bg-surface-subtle transition-colors active:scale-[0.98]"
              >
                {cancelLabel || (isAr ? 'إلغاء' : 'Cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${config.btnClass} ${loading ? 'opacity-60 cursor-wait' : ''}`}
              >
                {loading ? (isAr ? 'جاري...' : 'Processing...') : (confirmLabel || (isAr ? 'تأكيد' : 'Confirm'))}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/** Imperative confirm dialog hook */
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

export function useConfirmDialog() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const ConfirmDialogRenderer = useCallback(() => (
    <ConfirmDialog
      isOpen={!!state}
      title={state?.title || ''}
      message={state?.message || ''}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      variant={state?.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialogRenderer };
}

export default ConfirmDialog;
