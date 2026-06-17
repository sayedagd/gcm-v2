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
import { pageTransition } from '@/theme/motion';

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
            transition={pageTransition}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-md"
            style={{ backgroundColor: 'var(--overlay-backdrop)', zIndex: zIndex || 100 }}
          />

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: (zIndex || 100) + 1 }}>
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={pageTransition}
                className={`surface-panel-strong w-full ${sizeClasses[size]} rounded-[var(--radius-lg)] border border-border/90`}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border/80 px-6 py-5">
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
                    className="ms-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-surface-subtle transition-colors"
                  >
                    <X size={16} className="text-text-subtle" />
                  </button>
                </div>

                {/* Content */}
                <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 py-5">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-border/80 px-6 py-4">
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
