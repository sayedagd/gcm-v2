/**
 * [AR] نظام تنبيهات حتمي — بديل لـ window.alert
 * [EN] Imperative Toast System — Drop-in replacement for window.alert
 *
 * Uses the Zustand notification store to show proper toast messages.
 * Can be called from anywhere (components, store actions, utilities).
 *
 * Usage:
 *   import { toast } from '@/utils/toast';
 *   toast.success('Operation completed');
 *   toast.error('Something went wrong');
 *   toast.info('Importing data...');
 *   toast.warning('Are you sure?');
 */
import { useGCMStore } from '@/store';
import { NotificationType } from '@/types';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const typeMap: Record<ToastType, NotificationType> = {
  success: NotificationType.SUCCESS,
  error: NotificationType.ERROR,
  warning: NotificationType.WARNING,
  info: NotificationType.INFO,
};

const titleMap: Record<ToastType, [string, string]> = {
  success: ['تم بنجاح', 'Success'],
  error: ['خطأ', 'Error'],
  warning: ['تنبيه', 'Warning'],
  info: ['معلومة', 'Info'],
};

function showToast(type: ToastType, message: string, customTitle?: string) {
  const store = useGCMStore.getState();
  const isAr = store.saasConfig.language === 'ar';
  const [arTitle, enTitle] = titleMap[type];

  // Fire-and-forget — don't await, it's a UI notification
  store.addNotification({
    title: customTitle || (isAr ? arTitle : enTitle),
    message,
    type: typeMap[type],
  }).catch(() => {
    // Silent fallback — notification failed to persist but toast was shown
  });
}

export const toast = {
  success: (message: string, title?: string) => showToast('success', message, title),
  error: (message: string, title?: string) => showToast('error', message, title),
  warning: (message: string, title?: string) => showToast('warning', message, title),
  info: (message: string, title?: string) => showToast('info', message, title),
};

export default toast;
