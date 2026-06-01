/**
 * =====================================================
 * [AR] مخططات التحقق المركزية - Single Source of Truth
 * [EN] Centralized Validation Schemas — All Entities
 * =====================================================
 *
 * [AR] كيفية الاستخدام: قبل إرسال أي بيانات للـ API،
 *       استخدم الـ validate() المناسب للكيان.
 *       أي خطأ سيُرجع رسالة واضحة ثنائية اللغة.
 *
 * [EN] Usage: Before sending any data to the API,
 *       call the appropriate validate() function.
 *       Errors return a bilingual message string.
 */

import Joi from 'joi';
import { TripStatus, FacilityType } from '@/types';

// ─────────────────────────────────────────────
// Validation Result Type
// ─────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  /** Bilingual error string (Arabic | English) */
  errorAr?: string;
  errorEn?: string;
}

/** Maps a Joi error to a bilingual message */
const joiToResult = (error: Joi.ValidationError | undefined): ValidationResult => {
  if (!error) return { valid: true };
  const msg = error.details[0]?.message ?? 'Validation error';
  return { valid: false, errorAr: msg, errorEn: msg };
};

// ─────────────────────────────────────────────
// Shared Helpers
// ─────────────────────────────────────────────

/** Saudi CR format: 10 digits */
const crRegex = /^\d{10}$/;
/** Saudi VAT number: 15 digits starting with 3 */
const vatRegex = /^3\d{14}$/;
/** Date: accepts YYYY-MM-DD or full ISO string from PostgreSQL */
const dateRegex = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
/** Phone: starts with 05, 9 digits */
const phoneRegex = /^(05\d{8}|\+966\d{9})$/;

// ─────────────────────────────────────────────
// Company Schema
// ─────────────────────────────────────────────

const companySchema = Joi.object({
  company_id:      Joi.string().required(),
  company_name:    Joi.string().min(2).max(120).required().messages({
    'string.empty': 'اسم الشركة مطلوب | Company name is required',
    'string.min':   'اسم الشركة قصير جداً | Company name is too short',
  }),
  commercial_reg:  Joi.string().pattern(crRegex).required().messages({
    'string.pattern.base': 'رقم السجل التجاري يجب أن يكون 10 أرقام | CR must be 10 digits',
    'string.empty':        'رقم السجل التجاري مطلوب | CR number is required',
  }),
  vat_no:          Joi.string().pattern(vatRegex).optional().allow('', null).messages({
    'string.pattern.base': 'الرقم الضريبي يبدأ بـ 3 ويكون 15 رقم | VAT must start with 3 and be 15 digits',
  }),
  client_since:    Joi.string().pattern(dateRegex).optional().allow('', null),
  contact_email:   Joi.string().email({ tlds: { allow: false } }).optional().allow('', null).messages({
    'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
  }),
  contact_phone:   Joi.string().pattern(phoneRegex).optional().allow('', null).messages({
    'string.pattern.base': 'رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام | Phone must start with 05',
  }),
}).unknown(true);

// ─────────────────────────────────────────────
// Project Schema
// ─────────────────────────────────────────────

const projectSchema = Joi.object({
  project_id:       Joi.string().required(),
  project_name:     Joi.string().min(2).max(150).required().messages({
    'string.empty': 'اسم المشروع مطلوب | Project name is required',
    'string.min':   'اسم المشروع قصير جداً | Project name is too short',
  }),
  company_id:       Joi.string().required().messages({
    'string.empty': 'يجب اختيار شركة عميلة | A client company must be selected',
  }),
  budget:           Joi.number().min(0).required().messages({
    'number.min':  'الميزانية يجب أن تكون صفر أو أكثر | Budget must be 0 or greater',
    'number.base': 'الميزانية يجب أن تكون رقماً | Budget must be a number',
  }),
  total_quantities: Joi.number().min(0).required().messages({
    'number.min':  'الكمية يجب أن تكون صفر أو أكثر | Total quantities must be 0 or greater',
  }),
  start_date:       Joi.string().pattern(dateRegex).required().messages({
    'string.empty':        'تاريخ البدء مطلوب | Start date is required',
    'string.pattern.base': 'تاريخ البدء بصيغة خاطئة | Invalid start date format (YYYY-MM-DD)',
  }),
  end_date:         Joi.string().pattern(dateRegex).required().messages({
    'string.empty':        'تاريخ الانتهاء مطلوب | End date is required',
    'string.pattern.base': 'تاريخ الانتهاء بصيغة خاطئة | Invalid end date format (YYYY-MM-DD)',
  }),
  status:           Joi.string().valid('ACTIVE', 'ARCHIVED', 'COMPLETED').optional(),
}).unknown(true).custom((value, helpers) => {
  if (value.start_date && value.end_date && value.start_date > value.end_date) {
    return helpers.error('any.invalid', { message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء | End date must be after start date' });
  }
  return value;
});

// ─────────────────────────────────────────────
// Trip Schema
// ─────────────────────────────────────────────

const tripSchema = Joi.object({
  trip_id:     Joi.string().required(),
  project_id:  Joi.string().required().messages({
    'string.empty': 'يجب اختيار مشروع | A project must be selected',
  }),
  service_id:  Joi.string().required().messages({
    'string.empty': 'يجب اختيار خدمة | A service must be selected',
  }),
  date:        Joi.string().pattern(dateRegex).required().messages({
    'string.empty':        'تاريخ الرحلة مطلوب | Trip date is required',
    'string.pattern.base': 'صيغة التاريخ خاطئة | Invalid date format (YYYY-MM-DD)',
  }),
  quantity:    Joi.alternatives().try(
    Joi.number().positive(),
    Joi.string().regex(/^\d+(\.\d+)?$/)
  ).required().messages({
    'alternatives.match': 'الكمية يجب أن تكون رقماً موجباً | Quantity must be a positive number',
    'any.required':       'الكمية مطلوبة | Quantity is required',
  }),
  unit:        Joi.string().valid('TON', 'KG', 'CBM').required().messages({
    'any.only': 'الوحدة يجب أن تكون TON أو KG أو CBM | Unit must be TON, KG, or CBM',
  }),
  status:      Joi.string().valid(...Object.values(TripStatus)).required(),
  facility_id: Joi.string().optional().allow('', null),
}).unknown(true).custom((value, helpers) => {
  // Guard: trip date not more than 1 day in the future
  if (value.date) {
    const tripDate = new Date(value.date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tripDate > tomorrow) {
      return helpers.error('any.invalid', {
        message: 'لا يمكن تسجيل رحلة بتاريخ مستقبلي أكثر من يوم | Trip date cannot be more than 1 day in the future'
      });
    }
  }
  return value;
});

// ─────────────────────────────────────────────
// Vehicle Schema
// ─────────────────────────────────────────────

const vehicleSchema = Joi.object({
  vehicle_id:    Joi.string().required(),
  plate_no:      Joi.string().min(3).max(20).required().messages({
    'string.empty': 'رقم اللوحة مطلوب | Plate number is required',
    'string.min':   'رقم اللوحة قصير جداً | Plate number is too short',
  }),
  vehicle_type:  Joi.string().required().messages({
    'string.empty': 'نوع المركبة مطلوب | Vehicle type is required',
  }),
  status:        Joi.string().valid('ACTIVE', 'MAINTENANCE', 'INACTIVE').required(),
  ownership_type:Joi.string().valid('INTERNAL', 'SUPPLIER').required(),
  permit_count:  Joi.number().min(0).required(),
}).unknown(true);

// ─────────────────────────────────────────────
// Driver Schema
// ─────────────────────────────────────────────

const driverSchema = Joi.object({
  driver_id:     Joi.string().required(),
  name:          Joi.string().min(2).max(100).required().messages({
    'string.empty': 'اسم السائق مطلوب | Driver name is required',
    'string.min':   'الاسم قصير جداً | Name is too short',
  }),
  status:        Joi.string().valid('ACTIVE', 'ON_LEAVE', 'INACTIVE').required(),
  category:      Joi.string().valid('MANAGEMENT', 'OPERATIONS').required(),
  ownership_type:Joi.string().valid('INTERNAL', 'SUPPLIER').required(),
  license_no:    Joi.string().optional().allow('', null),
  // [FIX] Accept both YYYY-MM-DD and full ISO datetime returned by PostgreSQL
  license_expiry: Joi.alternatives().try(
    Joi.string().pattern(dateRegex),
    Joi.date()
  ).optional().allow('', null).messages({
    'alternatives.match': 'صيغة تاريخ انتهاء الرخصة خاطئة | Invalid license expiry date format',
  }),
}).unknown(true);

// ─────────────────────────────────────────────
// Supplier Schema
// ─────────────────────────────────────────────

const supplierSchema = Joi.object({
  supplier_id:   Joi.string().required(),
  name:          Joi.string().min(2).max(120).required().messages({
    'string.empty': 'اسم المورد مطلوب | Supplier name is required',
    'string.min':   'الاسم قصير جداً | Name is too short',
  }),
  cr_no:         Joi.string().pattern(crRegex).required().messages({
    'string.pattern.base': 'رقم السجل التجاري يجب أن يكون 10 أرقام | CR must be 10 digits',
    'string.empty':        'رقم السجل التجاري مطلوب | CR number is required',
  }),
  status:        Joi.string().valid('ACTIVE', 'INACTIVE').required(),
  category:      Joi.string().valid('VEHICLES', 'CONTAINERS', 'STAFF', 'GENERAL').required(),
  tax_no:        Joi.string().optional().allow('', null),
  contract_start:Joi.string().pattern(dateRegex).optional().allow('', null),
  contract_end:  Joi.string().pattern(dateRegex).optional().allow('', null),
}).unknown(true).custom((value, helpers) => {
  if (value.contract_start && value.contract_end && value.contract_start > value.contract_end) {
    return helpers.error('any.invalid', {
      message: 'تاريخ انتهاء العقد يجب أن يكون بعد تاريخ البدء | Contract end must be after start'
    });
  }
  return value;
});

// ─────────────────────────────────────────────
// Facility Schema
// ─────────────────────────────────────────────

const facilitySchema = Joi.object({
  facility_id:     Joi.string().required(),
  name:            Joi.string().min(2).max(120).required().messages({
    'string.empty': 'اسم المرفق مطلوب | Facility name is required',
  }),
  type:            Joi.string().valid(...Object.values(FacilityType)).required(),
  status:          Joi.string().valid('ACTIVE', 'INACTIVE').required(),
  accepted_services: Joi.array().items(Joi.string()).optional(),
  contract_start:  Joi.string().pattern(dateRegex).optional().allow('', null),
  contract_end:    Joi.string().pattern(dateRegex).optional().allow('', null),
}).unknown(true).custom((value, helpers) => {
  if (value.contract_start && value.contract_end && value.contract_start > value.contract_end) {
    return helpers.error('any.invalid', {
      message: 'تاريخ انتهاء العقد يجب أن يكون بعد تاريخ البدء | Contract end must be after start'
    });
  }
  return value;
});

// ─────────────────────────────────────────────
// Service Schema
// ─────────────────────────────────────────────

const serviceSchema = Joi.object({
  service_id:   Joi.string().required(),
  service_name: Joi.string().min(2).max(150).required().messages({
    'string.empty': 'اسم الخدمة مطلوب | Service name is required',
  }),
  category:     Joi.string().valid('HAZARDOUS', 'GENERAL', 'WATER').optional(),
  parent_id:    Joi.string().optional().allow('', null),
}).unknown(true).custom((value, helpers) => {
  // Guard: service cannot be its own parent
  if (value.parent_id && value.parent_id === value.service_id) {
    return helpers.error('any.invalid', {
      message: 'الخدمة لا يمكن أن تكون أبًا لنفسها | Service cannot be its own parent'
    });
  }
  return value;
});

// ─────────────────────────────────────────────
// Container / Tank Schema (shared structure)
// ─────────────────────────────────────────────

const inventoryItemSchema = Joi.object({
  code:      Joi.string().min(1).max(50).required().messages({
    'string.empty': 'كود الأصل مطلوب | Asset code is required',
  }),
  status:    Joi.string().valid('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED').required(),
  ownership: Joi.string().valid('OWN', 'SUPPLIER').required(),
  size_id:   Joi.string().required().messages({
    'string.empty': 'يجب اختيار حجم | Size must be selected',
  }),
}).unknown(true);

// ─────────────────────────────────────────────
// Business Logic Guards (Relational Integrity)
// ─────────────────────────────────────────────

/**
 * [AR] التحقق من أن السائق غير منتهية صلاحية رخصته
 * [EN] Ensure driver license is not expired before assigning to a trip
 */
export const validateDriverForTrip = (driver: { name: string; license_expiry?: string }): ValidationResult => {
  if (!driver.license_expiry) return { valid: true };
  const expiry = new Date(driver.license_expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) {
    return {
      valid: false,
      errorAr: `رخصة السائق "${driver.name}" منتهية الصلاحية (${driver.license_expiry}) — لا يمكن تعيينه`,
      errorEn: `Driver "${driver.name}" license expired on ${driver.license_expiry} — cannot be assigned`,
    };
  }
  return { valid: true };
};

/**
 * [AR] التحقق من أن المركبة ليست في الصيانة
 * [EN] Ensure vehicle is not in MAINTENANCE before assigning to a trip
 */
export const validateVehicleForTrip = (vehicle: { plate_no: string; status: string }): ValidationResult => {
  if (vehicle.status === 'MAINTENANCE') {
    return {
      valid: false,
      errorAr: `المركبة "${vehicle.plate_no}" في الصيانة حالياً — لا يمكن تعيينها`,
      errorEn: `Vehicle "${vehicle.plate_no}" is currently in MAINTENANCE — cannot be assigned`,
    };
  }
  if (vehicle.status === 'INACTIVE') {
    return {
      valid: false,
      errorAr: `المركبة "${vehicle.plate_no}" غير نشطة — لا يمكن تعيينها`,
      errorEn: `Vehicle "${vehicle.plate_no}" is INACTIVE — cannot be assigned`,
    };
  }
  return { valid: true };
};

/**
 * [AR] التحقق من أن المشروع ينتمي لشركة نشطة
 * [EN] Ensure project belongs to an active company
 */
export const validateProjectHasCompany = (companyId: string, companies: { company_id: string }[]): ValidationResult => {
  if (!companyId || !companies.some(c => c.company_id === companyId)) {
    return {
      valid: false,
      errorAr: 'يجب أن يرتبط المشروع بشركة عميلة مسجلة | Project must belong to a registered client company',
      errorEn: 'Project must belong to a registered client company',
    };
  }
  return { valid: true };
};

/**
 * [AR] التحقق من أن المرفق يقبل هذه الخدمة
 * [EN] Validate that the facility accepts the selected service
 */
export const validateFacilityAcceptsService = (
  facility: { name: string; accepted_services?: string[] },
  serviceId: string
): ValidationResult => {
  const accepted = facility.accepted_services ?? [];
  if (accepted.length > 0 && !accepted.includes(serviceId)) {
    return {
      valid: false,
      errorAr: `المرفق "${facility.name}" لا يقبل هذا النوع من النفايات`,
      errorEn: `Facility "${facility.name}" does not accept this waste type`,
    };
  }
  return { valid: true };
};

// ─────────────────────────────────────────────
// Public Validate Functions
// ─────────────────────────────────────────────

const validate = (schema: Joi.ObjectSchema, data: Record<string, any>): ValidationResult => {
  const { error } = schema.validate(data, { abortEarly: true, allowUnknown: true });
  return joiToResult(error);
};

export const validateCompany    = (data: Record<string, any>) => validate(companySchema, data);
export const validateProject    = (data: Record<string, any>) => validate(projectSchema, data);
export const validateTrip       = (data: Record<string, any>) => validate(tripSchema, data);
export const validateVehicle    = (data: Record<string, any>) => validate(vehicleSchema, data);
export const validateDriver     = (data: Record<string, any>) => validate(driverSchema, data);
export const validateSupplier   = (data: Record<string, any>) => validate(supplierSchema, data);
export const validateFacility   = (data: Record<string, any>) => validate(facilitySchema, data);
export const validateService    = (data: Record<string, any>) => validate(serviceSchema, data);
export const validateInventory  = (data: Record<string, any>) => validate(inventoryItemSchema, data);
