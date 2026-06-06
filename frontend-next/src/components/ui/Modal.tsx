/**
 * =====================================================
 * [AR] مكون النافذة المنبثقة
 * [EN] Modal Dialog Component
 * =====================================================
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@mantine/core';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  footer?: React.ReactNode;
  isAr?: boolean;
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  isAr = false,
  zIndex
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    '3xl': 'max-w-[85vw]',
    '4xl': 'max-w-[90vw]',
    '5xl': 'max-w-[95vw]',
    full: 'max-w-[98vw]'
  };

  return (
    <Portal style={{ position: 'relative', zIndex: zIndex || 100 }}>
      <AnimatePresence>
        {isOpen && (
          <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: zIndex || 100 }}
          />

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: (zIndex || 100) + 1 }}>
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full ${sizeClasses[size]} bg-surface rounded-2xl shadow-xl border border-border`}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-border">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-text-main truncate">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="text-sm text-text-subtle mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center transition-colors ms-3 shrink-0"
                  >
                    <X size={16} className="text-text-subtle" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </>
      )}
      </AnimatePresence>
    </Portal>
  );
};

export default Modal;
