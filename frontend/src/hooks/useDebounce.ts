/**
 * [AR] خطاف التأخير الذكي — يمنع التنفيذ المتكرر
 * [EN] Debounce Hook — Prevents excessive re-computation on rapid input
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 300);
 *   // Use debouncedSearch in useMemo dependencies instead of searchTerm
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounces a value by the given delay (ms).
 * Returns the debounced value that only updates after the delay.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback — useful for event handlers.
 * Returns a stable function that only fires after `delay` ms of inactivity.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedFn = useCallback((...args: any[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debouncedFn as T;
}

export default useDebounce;
