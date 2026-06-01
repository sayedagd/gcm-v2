/**
 * =====================================================
 * BATCH 1C — Exhaustive Tests for translation.ts
 * Target: 100% Statement, Branch, Path Coverage
 * Function: t()
 * =====================================================
 */

import { describe, it, expect } from 'vitest';
import { t } from '@/utils/translation';

describe('t (translation helper)', () => {
    // -----------------------------------------------
    // Branch: !obj → return ''
    // -----------------------------------------------
    describe('falsy input → return empty string', () => {
        it('returns "" for null', () => {
            expect(t(null, false)).toBe('');
        });

        it('returns "" for undefined', () => {
            expect(t(undefined, false)).toBe('');
        });

        it('returns "" for 0', () => {
            expect(t(0, false)).toBe('');
        });

        it('returns "" for false', () => {
            expect(t(false, false)).toBe('');
        });

        it('returns "" for empty string', () => {
            expect(t('', false)).toBe('');
        });
    });

    // -----------------------------------------------
    // Branch: typeof obj === 'string' → return obj
    // -----------------------------------------------
    describe('string input → return as-is', () => {
        it('returns a simple string unchanged', () => {
            expect(t('Hello World', false)).toBe('Hello World');
        });

        it('returns an Arabic string unchanged', () => {
            expect(t('مرحبا', true)).toBe('مرحبا');
        });

        it('returns a whitespace-only string unchanged', () => {
            expect(t('   ', false)).toBe('   ');
        });
    });

    // -----------------------------------------------
    // Branch: obj has {ar, en} — isAr=false
    // -----------------------------------------------
    describe('bilingual object — English mode (isAr=false)', () => {
        it('returns "en" when both ar and en exist', () => {
            expect(t({ ar: 'مرحبا', en: 'Hello' }, false)).toBe('Hello');
        });

        it('falls back to "ar" when en is undefined', () => {
            expect(t({ ar: 'مرحبا' }, false)).toBe('مرحبا');
        });

        it('falls back to "ar" when en is empty string', () => {
            // en || ar → '' is falsy → falls back to ar
            expect(t({ ar: 'مرحبا', en: '' }, false)).toBe('مرحبا');
        });

        it('returns en when ar is undefined', () => {
            expect(t({ en: 'Hello' }, false)).toBe('Hello');
        });

        it('returns empty string when both ar and en are empty', () => {
            expect(t({ ar: '', en: '' }, false)).toBe('');
        });
    });

    // -----------------------------------------------
    // Branch: obj has {ar, en} — isAr=true
    // -----------------------------------------------
    describe('bilingual object — Arabic mode (isAr=true)', () => {
        it('returns "ar" when both ar and en exist', () => {
            expect(t({ ar: 'مرحبا', en: 'Hello' }, true)).toBe('مرحبا');
        });

        it('falls back to "en" when ar is undefined', () => {
            expect(t({ en: 'Hello' }, true)).toBe('Hello');
        });

        it('falls back to "en" when ar is empty string', () => {
            // ar || en → '' is falsy → falls back to en
            expect(t({ ar: '', en: 'Hello' }, true)).toBe('Hello');
        });

        it('returns ar when en is undefined', () => {
            expect(t({ ar: 'مرحبا' }, true)).toBe('مرحبا');
        });
    });

    // -----------------------------------------------
    // Branch: obj.ar === undefined AND obj.en === undefined
    //         → falls through to String(obj)
    // -----------------------------------------------
    describe('non-bilingual object → String(obj)', () => {
        it('returns "[object Object]" for a plain object without ar/en', () => {
            expect(t({ name: 'test' }, false)).toBe('[object Object]');
        });

        it('returns string representation of a number (truthy)', () => {
            expect(t(42, false)).toBe('42');
        });

        it('returns "true" for boolean true', () => {
            expect(t(true, false)).toBe('true');
        });
    });

    // -----------------------------------------------
    // Edge: ar/en with null values
    // -----------------------------------------------
    describe('edge: null values within bilingual object', () => {
        it('falls back when ar is null and en exists', () => {
            expect(t({ ar: null, en: 'Hello' }, true)).toBe('Hello');
        });

        it('falls back when en is null and ar exists', () => {
            expect(t({ ar: 'مرحبا', en: null }, false)).toBe('مرحبا');
        });

        it('returns null coerced when both are null (ar set → passes undefined check)', () => {
            // obj.ar !== undefined → true (null !== undefined)
            // isAr ? (null || null) → null
            const result = t({ ar: null, en: null }, true);
            expect(result).toBeFalsy();
        });
    });
});
