/**
 * GCM ERP - Backend Unit Tests
 * Phase 1.1: Bilingual Errors Tests
 */

const {
  getFieldName,
  getEntityName,
  requiredField,
  duplicateEntity,
  entityNotFound,
  invalidData,
  deleteRestricted,
  serverError,
  translatePgError,
  translateJoiErrors,
  UNIQUE_RULES
} = require('../../../src/shared/utils/bilingualErrors');

describe('getBilingualError()', () => {
  describe('PostgreSQL error translation', () => {
    test('returns Arabic + English message for pg error code 23505 (unique violation)', () => {
      const pgError = {
        code: '23505',
        detail: 'Key (company_name)=(Test Company) already exists.',
        table: 'companies'
      };

      const result = translatePgError(pgError, 'companies');

      expect(result).toHaveProperty('errorAr');
      expect(result).toHaveProperty('errorEn');
      expect(result).toHaveProperty('code', 'DUPLICATE');
      expect(result.errorAr).toContain('موجود مسبقاً');
      expect(result.errorEn).toContain('already exists');
    });

    test('returns Arabic + English message for pg error code 23503 (FK violation)', () => {
      const pgError = {
        code: '23503',
        detail: 'Key (company_id)=(COMP-123) is not present in table "companies"',
        table: 'trips'
      };

      const result = translatePgError(pgError, 'trips');

      expect(result).toHaveProperty('code', 'FK_VIOLATION');
      expect(result.errorAr).toContain('لا يمكن إتمام العملية');
      expect(result.errorEn).toContain('Cannot complete operation');
    });

    test('returns Arabic + English message for pg error code 22001 (value too long)', () => {
      const pgError = {
        code: '22001',
        message: 'string too long for type character varying(255)',
        table: 'companies'
      };

      const result = translatePgError(pgError, 'companies');

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('errorAr');
      expect(result).toHaveProperty('errorEn');
    });

    test('returns generic fallback for unknown error codes', () => {
      const pgError = {
        code: '99999',
        message: 'Unknown error',
        table: 'companies'
      };

      const result = translatePgError(pgError, 'companies');

      expect(result).toHaveProperty('code', 'SERVER_ERROR');
      expect(result.errorAr).toContain('حدث خطأ في الخادم');
      expect(result.errorEn).toContain('server error');
    });
  });

  describe('Joi error translation', () => {
    test('translates required field errors', () => {
      const joiDetails = [
        {
          path: ['company_name'],
          type: 'any.required'
        }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('code', 'REQUIRED');
      expect(result[0].errorAr).toContain('مطلوب');
      expect(result[0].errorEn).toContain('is required');
    });

    test('translates email validation errors', () => {
      const joiDetails = [
        {
          path: ['email'],
          type: 'string.email'
        }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result[0]).toHaveProperty('code', 'INVALID');
      expect(result[0].errorAr).toContain('صيغة البريد الإلكتروني');
      expect(result[0].errorEn).toContain('Invalid email');
    });

    test('translates date validation errors', () => {
      const joiDetails = [
        {
          path: ['date'],
          type: 'date.base'
        }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result[0]).toHaveProperty('code', 'INVALID');
      expect(result[0].errorAr).toContain('التاريخ غير صحيح');
      expect(result[0].errorEn).toContain('Invalid date');
    });

    test('translates number validation errors', () => {
      const joiDetails = [
        {
          path: ['quantity'],
          type: 'number.base'
        }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result[0]).toHaveProperty('code', 'INVALID');
      expect(result[0].errorAr).toContain('رقماً');
      expect(result[0].errorEn).toContain('must be a number');
    });

    test('translates positive number validation errors', () => {
      const joiDetails = [
        {
          path: ['unit_price'],
          type: 'number.positive'
        }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result[0]).toHaveProperty('code', 'INVALID');
      expect(result[0].errorAr).toContain('أكبر من صفر');
      expect(result[0].errorEn).toContain('greater than zero');
    });

    test('handles multiple errors', () => {
      const joiDetails = [
        { path: ['company_name'], type: 'any.required' },
        { path: ['email'], type: 'string.email' },
        { path: ['phone'], type: 'string.empty' }
      ];

      const result = translateJoiErrors(joiDetails);

      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('REQUIRED');
      expect(result[1].code).toBe('INVALID');
      expect(result[2].code).toBe('REQUIRED');
    });
  });

  describe('Helper functions', () => {
    test('getFieldName returns bilingual field names', () => {
      const result = getFieldName('company_name');
      expect(result).toEqual({
        ar: 'اسم العميل',
        en: 'Company Name'
      });
    });

    test('getFieldName returns original field name if unknown', () => {
      const result = getFieldName('unknown_field');
      expect(result).toEqual({
        ar: 'unknown_field',
        en: 'unknown_field'
      });
    });

    test('getEntityName returns bilingual entity names', () => {
      const result = getEntityName('companies');
      expect(result).toEqual({
        ar: 'العميل',
        en: 'Company'
      });
    });

    test('getEntityName returns original entity name if unknown', () => {
      const result = getEntityName('unknown_entity');
      expect(result).toEqual({
        ar: 'unknown_entity',
        en: 'unknown_entity'
      });
    });

    test('requiredField creates required error', () => {
      const result = requiredField('email');
      expect(result).toEqual({
        code: 'REQUIRED',
        field: 'email',
        errorAr: expect.stringContaining('مطلوب'),
        errorEn: expect.stringContaining('is required')
      });
    });

    test('duplicateEntity creates duplicate error', () => {
      const result = duplicateEntity('companies', 'Test Company');
      expect(result).toEqual({
        code: 'DUPLICATE',
        errorAr: expect.stringContaining('Test Company'),
        errorAr: expect.stringContaining('مسجل مسبقاً'),
        errorEn: expect.stringContaining('Test Company'),
        errorEn: expect.stringContaining('already exists')
      });
    });

    test('entityNotFound creates not found error', () => {
      const result = entityNotFound('projects');
      expect(result).toEqual({
        code: 'NOT_FOUND',
        errorAr: expect.stringContaining('المشروع'),
        errorAr: expect.stringContaining('غير موجود'),
        errorEn: expect.stringContaining('Project'),
        errorEn: expect.stringContaining('does not exist')
      });
    });

    test('invalidData creates validation error', () => {
      const result = invalidData('email', 'email');
      expect(result).toEqual({
        code: 'INVALID',
        field: 'email',
        errorAr: expect.stringContaining('صيغة البريد الإلكتروني'),
        errorEn: expect.stringContaining('Invalid email')
      });
    });

    test('deleteRestricted creates delete restriction error', () => {
      const result = deleteRestricted('companies', 'projects');
      expect(result).toEqual({
        code: 'DELETE_RESTRICTED',
        errorAr: expect.stringContaining('لا يمكن حذف'),
        errorAr: expect.stringContaining('العميل'),
        errorAr: expect.stringContaining('المشروع'),
        errorEn: expect.stringContaining('Cannot delete'),
        errorEn: expect.stringContaining('Company'),
        errorEn: expect.stringContaining('Project')
      });
    });

    test('serverError creates generic server error', () => {
      const result = serverError('Database connection failed');
      expect(result).toEqual({
        code: 'SERVER_ERROR',
        errorAr: expect.stringContaining('حدث خطأ في الخادم'),
        errorAr: expect.stringContaining('Database connection failed'),
        errorEn: expect.stringContaining('server error'),
        errorEn: expect.stringContaining('Database connection failed')
      });
    });
  });

  describe('UNIQUE_RULES', () => {
    test('contains rules for all main entities', () => {
      expect(UNIQUE_RULES).toHaveProperty('companies');
      expect(UNIQUE_RULES).toHaveProperty('projects');
      expect(UNIQUE_RULES).toHaveProperty('users');
      expect(UNIQUE_RULES).toHaveProperty('services');
      expect(UNIQUE_RULES).toHaveProperty('vehicles');
    });

    test('company rule has correct structure', () => {
      expect(UNIQUE_RULES.companies).toEqual({
        field: 'company_name',
        column: 'company_name',
        label: 'اسم العميل'
      });
    });

    test('project rule includes scope', () => {
      expect(UNIQUE_RULES.projects).toHaveProperty('scope', 'company_id');
    });
  });
});