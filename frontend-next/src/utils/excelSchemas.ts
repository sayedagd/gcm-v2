/**
 * =====================================================
 * [AR] مخططات Excel المركزية - Single Source of Truth
 * [EN] Centralized Excel Schema Definitions
 * =====================================================
 *
 * [AR] كيفية الاستخدام: عند إضافة حقل جديد لأي نوع بيانات،
 *       أضف تعريفه هنا فقط — التصدير والقالب والاستيراد
 *       يتحدثون تلقائياً.
 *
 * [EN] How to use: When adding a new field to any data type,
 *       define it here ONLY — export, template, and import
 *       all update automatically.
 */

// ─────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────

/**
 * Defines a single column mapping between the Excel sheet and the entity object.
 *
 * @param header   - Excel column header (the user sees this)
 * @param field    - The key on the entity object (must match the TS interface)
 * @param required - If true, import will skip rows where this field is empty
 * @param default  - Default value used during import if the column is missing
 * @param transform - Optional transform applied to the raw Excel value during import
 * @param exportTransform - Optional transform applied to the entity value during export
 * @param importOnly  - Column is only used during import (not emitted in export)
 * @param exportOnly  - Column is only used during export (not part of template)
 */
export interface ExcelColumnDef<T = any> {
  header: string;
  field: keyof T | string;
  required?: boolean;
  default?: any;
  transform?: (rawValue: any, row: Record<string, any>) => any;
  exportTransform?: (value: any, entity: T) => any;
  importOnly?: boolean;
  exportOnly?: boolean;
}

export interface ExcelSchema<T = any> {
  /** Human-readable entity name used in toast messages */
  entityName: string;
  /** Unique key that identifies each record (used to detect updates vs inserts) */
  idField: keyof T;
  /** Ordered column definitions */
  columns: ExcelColumnDef<T>[];
  /**
   * Minimal fields required to construct a valid entity during import.
   * Called AFTER column transforms are applied.
   */
  buildEntity: (mapped: Partial<T>, row: Record<string, any>) => any;
  /**
   * Called to detect if an imported row is identical to an existing record.
   * Return true → skip (unchanged), false → update.
   */
  isUnchanged?: (existing: T, mapped: Partial<T>) => boolean;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const yn = (v: any) => (v === true || v === 'YES' || v === 'yes' || v === '1' ? 'YES' : 'NO');
const bool = (v: any) => v === 'YES' || v === true || v === '1' || v === 'yes';

// ─────────────────────────────────────────────
// Vehicle Schema
// ─────────────────────────────────────────────

import {
  Vehicle, Driver, Container, Tank, DocumentStatus,
  Company, Project, Trip, Service, Supplier, Facility, User, TripStatus, FacilityType
} from '@/types';

export const vehicleSchema: ExcelSchema<Vehicle> = {
  entityName: 'Vehicle',
  idField: 'vehicle_id',
  columns: [
    // ── Identification ──────────────────────────────────────────────────
    { header: 'Vehicle ID',       field: 'vehicle_id' },
    { header: 'Plate No',         field: 'plate_no' },
    { header: 'Vehicle Type',     field: 'vehicle_type' },

    // ── Status & Classification ─────────────────────────────────────────
    {
      header: 'Status',
      field: 'status',
      default: 'ACTIVE',
      transform: (v) => (['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(v) ? v : 'ACTIVE'),
    },
    {
      header: 'Ownership',
      field: 'ownership_type',
      default: 'INTERNAL',
      transform: (v) => (v === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL'),
    },
    {
      header: 'Small Vehicle',
      field: 'is_small_vehicle',
      default: 'NO',
      transform: bool,
      exportTransform: yn,
    },

    // ── Supplier ────────────────────────────────────────────────────────
    { header: 'Supplier ID',   field: 'supplier_id',   default: '' },
    { header: 'Supplier Name', field: 'supplier_name', default: '' },

    // ── Permits ─────────────────────────────────────────────────────────
    {
      header: 'Permit Count',
      field: 'permit_count',
      default: 0,
      transform: (v) => Number(v) || 0,
    },
    {
      header: 'Permit Zones',
      field: 'permit_zones',
      default: '',
    },

    // ── Compliance Documents ─────────────────────────────────────────────
    // Each document type gets its own pair of columns (Number + Expiry) so
    // that the sheet is readable in Excel without needing to parse JSON.
    // On import these are reconstructed back into the documents[] array.
    // NOTE: Add new document types here — no other file needs changing.
    {
      header: 'Doc: Registration Card No',
      field: '_doc_registration_card_no',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Registration Card', 'number'),
      transform: () => undefined, // handled in buildEntity
      exportOnly: false,
    },
    {
      header: 'Doc: Registration Card Expiry',
      field: '_doc_registration_card_expiry',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Registration Card', 'expiry_date'),
      transform: () => undefined,
      exportOnly: false,
    },
    {
      header: 'Doc: Insurance No',
      field: '_doc_insurance_no',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Insurance', 'number'),
      transform: () => undefined,
    },
    {
      header: 'Doc: Insurance Expiry',
      field: '_doc_insurance_expiry',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Insurance', 'expiry_date'),
      transform: () => undefined,
    },
    {
      header: 'Doc: Fitness No',
      field: '_doc_fitness_no',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Fitness', 'number'),
      transform: () => undefined,
    },
    {
      header: 'Doc: Fitness Expiry',
      field: '_doc_fitness_expiry',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Fitness', 'expiry_date'),
      transform: () => undefined,
    },
    {
      header: 'Doc: Inspection Certificate No',
      field: '_doc_inspection_no',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Inspection Certificate', 'number'),
      transform: () => undefined,
    },
    {
      header: 'Doc: Inspection Certificate Expiry',
      field: '_doc_inspection_expiry',
      exportTransform: (_v, e) => _getDocField(e.documents, 'Inspection Certificate', 'expiry_date'),
      transform: () => undefined,
    },
  ],

  buildEntity: (mapped, row) => {
    // Reconstruct documents[] from flat columns
    const docs = _buildDocumentsFromRow(row, [
      { type: 'Registration Card',     noCol: 'Doc: Registration Card No',          expiryCol: 'Doc: Registration Card Expiry',          weight: 30 },
      { type: 'Insurance',             noCol: 'Doc: Insurance No',                  expiryCol: 'Doc: Insurance Expiry',                  weight: 30 },
      { type: 'Fitness',               noCol: 'Doc: Fitness No',                    expiryCol: 'Doc: Fitness Expiry',                    weight: 20 },
      { type: 'Inspection Certificate',noCol: 'Doc: Inspection Certificate No',     expiryCol: 'Doc: Inspection Certificate Expiry',     weight: 20 },
    ]);

    return {
      vehicle_id:     mapped.vehicle_id    || `V-${Date.now()}`,
      plate_no:       (mapped.plate_no     as string) || '',
      vehicle_type:   (mapped.vehicle_type as string) || '',
      status:         (mapped.status       as any) || 'ACTIVE',
      ownership_type: (mapped.ownership_type as any) || 'INTERNAL',
      is_small_vehicle: mapped.is_small_vehicle as boolean || false,
      ...((mapped.supplier_id  as string) ? { supplier_id: (mapped.supplier_id  as string) } : {}),
      ...((mapped.supplier_name as string) ? { supplier_name: (mapped.supplier_name as string) } : {}),
      permit_count:   Number(mapped.permit_count) || 0,
      ...((mapped.permit_zones as string) ? { permit_zones: (mapped.permit_zones as string) } : {}),
      ...(docs.length > 0 ? { documents: docs } : {}),
    };
  },

  isUnchanged: (existing, mapped) =>
    existing.plate_no     === mapped.plate_no &&
    existing.vehicle_type === mapped.vehicle_type &&
    existing.status       === mapped.status,
};

// ─────────────────────────────────────────────
// Driver Schema
// ─────────────────────────────────────────────

export const driverSchema: ExcelSchema<Driver> = {
  entityName: 'Driver / Staff',
  idField: 'driver_id',
  columns: [
    // ── Identification ──────────────────────────────────────────────────
    { header: 'Driver ID',     field: 'driver_id' },
    { header: 'Name',          field: 'name',          default: '' },
    { header: 'Phone',         field: 'phone',          default: '' },
    { header: 'Role Title',    field: 'role_title',     default: '' },

    // ── Classification ──────────────────────────────────────────────────
    {
      header: 'Category',
      field: 'category',
      default: 'OPERATIONS',
      transform: (v) => (['MANAGEMENT', 'OPERATIONS'].includes(v) ? v : 'OPERATIONS'),
    },
    {
      header: 'Ownership',
      field: 'ownership_type',
      default: 'INTERNAL',
      transform: (v) => (v === 'SUPPLIER' ? 'SUPPLIER' : 'INTERNAL'),
    },
    {
      header: 'Status',
      field: 'status',
      default: 'ACTIVE',
      transform: (v) => (['ACTIVE', 'ON_LEAVE', 'INACTIVE'].includes(v) ? v : 'ACTIVE'),
    },

    // ── Supplier ────────────────────────────────────────────────────────
    { header: 'Supplier ID',   field: 'supplier_id',   default: '' },
    { header: 'Supplier Name', field: 'supplier_name', default: '' },

    // ── License ─────────────────────────────────────────────────────────
    { header: 'License No',     field: 'license_no',     default: '' },
    { header: 'License Expiry', field: 'license_expiry', default: '' },

    // ── Iqama (Residency) ────────────────────────────────────────────────
    { header: 'Iqama No',     field: 'iqama_no',     default: '' },
    { header: 'Iqama Expiry', field: 'iqama_expiry', default: '' },

    // ── Operating Card ───────────────────────────────────────────────────
    { header: 'Operating Card No',     field: 'operating_card_no',     default: '' },
    { header: 'Operating Card Expiry', field: 'operating_card_expiry', default: '' },

    // ── Insurance ────────────────────────────────────────────────────────
    { header: 'Insurance No',     field: 'insurance_no',     default: '' },
    { header: 'Insurance Expiry', field: 'insurance_expiry', default: '' },

    // ── Permits ─────────────────────────────────────────────────────────
    {
      header: 'Permit Count',
      field: 'permit_count',
      default: 0,
      transform: (v) => Number(v) || 0,
    },
    { header: 'Permit Zones', field: 'permit_zones', default: '' },

    // ── Vehicle Assignment ───────────────────────────────────────────────
    { header: 'Vehicle ID', field: 'vehicle_id', default: '' },
  ],

  buildEntity: (mapped) => ({
    driver_id:           (mapped.driver_id          as string) || `D-${Date.now()}`,
    name:                (mapped.name               as string) || '',
    phone:               (mapped.phone              as string) || '',
    ...((mapped.role_title         as string) ? { role_title: (mapped.role_title as string) } : {}),
    category:            (mapped.category           as any)   || 'OPERATIONS',
    ownership_type:      (mapped.ownership_type     as any)   || 'INTERNAL',
    status:              (mapped.status             as any)   || 'ACTIVE',
    ...((mapped.supplier_id        as string) ? { supplier_id: (mapped.supplier_id as string) } : {}),
    ...((mapped.supplier_name      as string) ? { supplier_name: (mapped.supplier_name as string) } : {}),
    license_no:          (mapped.license_no         as string) || '',
    ...((mapped.license_expiry     as string) ? { license_expiry: (mapped.license_expiry as string) } : {}),
    ...((mapped.iqama_no           as string) ? { iqama_no: (mapped.iqama_no as string) } : {}),
    ...((mapped.iqama_expiry       as string) ? { iqama_expiry: (mapped.iqama_expiry as string) } : {}),
    ...((mapped.operating_card_no  as string) ? { operating_card_no: (mapped.operating_card_no as string) } : {}),
    ...((mapped.operating_card_expiry as string) ? { operating_card_expiry: (mapped.operating_card_expiry as string) } : {}),
    ...((mapped.insurance_no       as string) ? { insurance_no: (mapped.insurance_no as string) } : {}),
    ...((mapped.insurance_expiry   as string) ? { insurance_expiry: (mapped.insurance_expiry as string) } : {}),
    permit_count:        Number(mapped.permit_count) || 0,
    ...((mapped.permit_zones       as string) ? { permit_zones: (mapped.permit_zones as string) } : {}),
    ...((mapped.vehicle_id         as string) ? { vehicle_id: (mapped.vehicle_id as string) } : {}),
  }),

  isUnchanged: (existing, mapped) =>
    existing.name   === mapped.name   &&
    existing.phone  === mapped.phone  &&
    existing.status === mapped.status,
};

// ─────────────────────────────────────────────
// Container Schema
// ─────────────────────────────────────────────

export const containerSchema: ExcelSchema<Container> = {
  entityName: 'Container',
  idField: 'container_id',
  columns: [
    { header: 'Container ID', field: 'container_id' },
    { header: 'Code',         field: 'code' },
    {
      header: 'Status',
      field: 'status',
      default: 'AVAILABLE',
      transform: (v) => (['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(v) ? v : 'AVAILABLE'),
    },
    {
      header: 'Ownership',
      field: 'ownership',
      default: 'OWN',
      transform: (v) => (v === 'SUPPLIER' ? 'SUPPLIER' : 'OWN'),
    },
    { header: 'Size ID',      field: 'size_id',    default: '' },
    { header: 'Project ID',   field: 'project_id', default: '' },
    { header: 'Supplier ID',  field: 'supplier_id',  default: '' },
    { header: 'Supplier Name',field: 'supplier_name',default: '' },
    { header: 'GPS Location', field: 'gps_location', default: '' },
    { header: 'Purchase Date',field: 'purchase_date',default: '' },
  ],

  buildEntity: (mapped) => ({
    container_id:  (mapped.container_id  as string) || `CON-${Date.now()}`,
    code:          (mapped.code          as string) || '',
    status:        (mapped.status        as any)   || 'AVAILABLE',
    ownership:     (mapped.ownership     as any)   || 'OWN',
    size_id:       (mapped.size_id       as string) || '',
    project_id:    (mapped.project_id    as string) || undefined,
    supplier_id:   (mapped.supplier_id   as string) || undefined,
    supplier_name: (mapped.supplier_name as string) || undefined,
    gps_location:  (mapped.gps_location  as string) || undefined,
    purchase_date: (mapped.purchase_date as string) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.code   === mapped.code &&
    existing.status === mapped.status,
};

// ─────────────────────────────────────────────
// Tank Schema
// ─────────────────────────────────────────────

export const tankSchema: ExcelSchema<Tank> = {
  entityName: 'Tank',
  idField: 'tank_id',
  columns: [
    { header: 'Tank ID',      field: 'tank_id' },
    { header: 'Code',         field: 'code' },
    {
      header: 'Status',
      field: 'status',
      default: 'AVAILABLE',
      transform: (v) => (['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(v) ? v : 'AVAILABLE'),
    },
    {
      header: 'Ownership',
      field: 'ownership',
      default: 'OWN',
      transform: (v) => (v === 'SUPPLIER' ? 'SUPPLIER' : 'OWN'),
    },
    { header: 'Size ID',      field: 'size_id',    default: '' },
    { header: 'Project ID',   field: 'project_id', default: '' },
    { header: 'Supplier ID',  field: 'supplier_id',  default: '' },
    { header: 'Supplier Name',field: 'supplier_name',default: '' },
    { header: 'GPS Location', field: 'gps_location', default: '' },
    { header: 'Purchase Date',field: 'purchase_date',default: '' },
  ],

  buildEntity: (mapped) => ({
    tank_id:       (mapped.tank_id       as string) || `TNK-${Date.now()}`,
    code:          (mapped.code          as string) || '',
    status:        (mapped.status        as any)   || 'AVAILABLE',
    ownership:     (mapped.ownership     as any)   || 'OWN',
    size_id:       (mapped.size_id       as string) || '',
    project_id:    (mapped.project_id    as string) || undefined,
    supplier_id:   (mapped.supplier_id   as string) || undefined,
    supplier_name: (mapped.supplier_name as string) || undefined,
    gps_location:  (mapped.gps_location  as string) || undefined,
    purchase_date: (mapped.purchase_date as string) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.code   === mapped.code &&
    existing.status === mapped.status,
};

// ─────────────────────────────────────────────
// Company Schema
// ─────────────────────────────────────────────

export const companySchema: ExcelSchema<Company> = {
  entityName: 'Company',
  idField: 'company_id',
  columns: [
    { header: 'Company ID',     field: 'company_id' },
    { header: 'Company Name',   field: 'company_name' },
    { header: 'CR Number',      field: 'commercial_reg' },
    { header: 'VAT Number',     field: 'vat_no',         default: '' },
    { header: 'Contract No',    field: 'contract_no',    default: '' },
    { header: 'Contact Name',   field: 'contact_name',   default: '' },
    { header: 'Contact Phone',  field: 'contact_phone',  default: '' },
    { header: 'Contact Email',  field: 'contact_email',  default: '' },
    { header: 'Client Since',   field: 'client_since',   default: '' },
    { header: 'Billing Address',field: 'billing_address', default: '' },
    { header: 'Location URL',   field: 'main_location_url', default: '' },
  ],

  buildEntity: (mapped) => ({
    company_id:       (mapped.company_id as string) || `C-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
    company_name:     (mapped.company_name as string) || '',
    commercial_reg:   (mapped.commercial_reg as string) || '',
    vat_no:           (mapped.vat_no as string) || undefined,
    contract_no:      (mapped.contract_no as string) || undefined,
    contact_name:     (mapped.contact_name as string) || undefined,
    contact_phone:    (mapped.contact_phone as string) || undefined,
    contact_email:    (mapped.contact_email as string) || undefined,
    client_since:     (mapped.client_since as string) || (new Date().toISOString().split('T')[0] || ''),
    billing_address:  (mapped.billing_address as string) || undefined,
    main_location_url:(mapped.main_location_url as string) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.company_name   === mapped.company_name &&
    existing.commercial_reg === mapped.commercial_reg &&
    existing.vat_no         === mapped.vat_no,
};

// ─────────────────────────────────────────────
// Project Schema
// ─────────────────────────────────────────────

export const projectSchema: ExcelSchema<Project> = {
  entityName: 'Project',
  idField: 'project_id',
  columns: [
    { header: 'Project ID',      field: 'project_id' },
    { header: 'Project Name',    field: 'project_name' },
    { header: 'Company ID',      field: 'company_id' },
    { header: 'Location',        field: 'location',        default: '' },
    { header: 'Map URL',         field: 'map_url',         default: '' },
    { header: 'PO Number',       field: 'po_number',       default: '' },
    { header: 'Details',         field: 'details',         default: '' },
    {
      header: 'Budget',
      field: 'budget',
      default: 0,
      transform: (v) => Number(v) || 0,
    },
    {
      header: 'Total Quantities',
      field: 'total_quantities',
      default: 0,
      transform: (v) => Number(v) || 0,
    },
    { header: 'Start Date',      field: 'start_date',      default: '' },
    { header: 'End Date',        field: 'end_date',        default: '' },
    {
      header: 'Status',
      field: 'status',
      default: 'ACTIVE',
      transform: (v) => (['ACTIVE', 'ARCHIVED', 'COMPLETED'].includes(v) ? v : 'ACTIVE'),
    },
    {
      header: 'Large Containers',
      field: '_assets_large',
      default: 0,
      exportTransform: (_v, e) => e.assets?.large_containers || 0,
      transform: (v) => Number(v) || 0,
    },
    {
      header: 'Small Containers',
      field: '_assets_small',
      default: 0,
      exportTransform: (_v, e) => e.assets?.small_containers || 0,
      transform: (v) => Number(v) || 0,
    },
    {
      header: 'Compactors',
      field: '_assets_compactors',
      default: 0,
      exportTransform: (_v, e) => e.assets?.compactors || 0,
      transform: (v) => Number(v) || 0,
    },
    {
      header: 'Other Assets',
      field: '_assets_other',
      default: '',
      exportTransform: (_v, e) => e.assets?.other_assets || '',
      transform: () => undefined,
    },
    {
      header: 'Service IDs',
      field: 'service_ids',
      default: '',
      exportTransform: (v) => Array.isArray(v) ? v.join(', ') : '',
      transform: (v) => typeof v === 'string' ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
  ],

  buildEntity: (mapped, row) => ({
    project_id:      (mapped.project_id as string) || `P-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
    project_name:    (mapped.project_name as string) || '',
    company_id:      (mapped.company_id as string) || '',
    location:        (mapped.location as string) || undefined,
    map_url:         (mapped.map_url as string) || undefined,
    po_number:       (mapped.po_number as string) || undefined,
    details:         (mapped.details as string) || undefined,
    budget:          Number(mapped.budget) || 0,
    total_quantities:Number(mapped.total_quantities) || 0,
    start_date:      (mapped.start_date as string) || '',
    end_date:        (mapped.end_date as string) || '',
    status:          (mapped.status as any) || 'ACTIVE',
    service_ids:     (mapped.service_ids as string[]) || [],
    assets: {
      large_containers: Number(row['Large Containers']) || 0,
      small_containers: Number(row['Small Containers']) || 0,
      compactors:       Number(row['Compactors']) || 0,
      other_assets:     row['Other Assets'] || undefined,
    },
  }),

  isUnchanged: (existing, mapped) =>
    existing.project_name === mapped.project_name &&
    existing.company_id   === mapped.company_id &&
    existing.status       === mapped.status,
};

// ─────────────────────────────────────────────
// Trip Schema
// ─────────────────────────────────────────────

export const tripSchema: ExcelSchema<Trip> = {
  entityName: 'Trip',
  idField: 'trip_id',
  columns: [
    { header: 'Trip ID',         field: 'trip_id' },
    { header: 'Date',            field: 'date' },
    { header: 'Time',            field: 'time',            default: '00:00' },
    { header: 'Company ID',      field: 'company_id',      default: '' },
    { header: 'Project ID',      field: 'project_id' },
    { header: 'Service ID',      field: 'service_id' },
    { header: 'Driver ID',       field: 'driver_id',       default: '' },
    { header: 'Vehicle ID',      field: 'vehicle_id',      default: '' },
    {
      header: 'Quantity',
      field: 'quantity',
      default: '1',
      transform: (v) => String(v || '1'),
    },
    {
      header: 'Unit',
      field: 'unit',
      default: 'TON',
      transform: (v) => (['TON', 'KG', 'CBM'].includes(v) ? v : 'TON'),
    },
    {
      header: 'Status',
      field: 'status',
      default: TripStatus.COMPLETED,
      transform: (v) => (Object.values(TripStatus).includes(v as TripStatus) ? v : TripStatus.COMPLETED),
    },
    {
      header: 'Priority',
      field: 'priority',
      default: 'NORMAL',
      transform: (v) => (['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(v) ? v : 'NORMAL'),
    },
    { header: 'Manifest No',     field: 'waste_manifest_no',  default: '' },
    { header: 'Delivery Note No',field: 'delivery_note_no',   default: '' },
    { header: 'Recycle Receipt', field: 'recycle_receipt_no',  default: '' },
    { header: 'Supervisor',      field: 'supervisor_name',    default: '' },
    { header: 'GCM Supervisor',  field: 'gcm_supervisor_name',default: '' },
    { header: 'Container Size',  field: 'container_size',     default: '' },
    { header: 'Preferred Time',  field: 'preferred_time',     default: '' },
    { header: 'Facility ID',     field: 'facility_id',        default: '' },
    { header: 'Supplier ID',     field: 'supplier_id',        default: '' },
    { header: 'Notes',           field: 'notes',              default: '' },
  ],

  buildEntity: (mapped) => ({
    trip_id:            (mapped.trip_id as string) || `T-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
    date:               (mapped.date as string) || (new Date().toISOString().split('T')[0] || ''),
    time:               (mapped.time as string) || '00:00',
    company_id:         (mapped.company_id as string) || '',
    project_id:         (mapped.project_id as string) || '',
    service_id:         (mapped.service_id as string) || '',
    driver_id:          (mapped.driver_id as string) || '',
    vehicle_id:         (mapped.vehicle_id as string) || '',
    quantity:           (mapped.quantity as string) || '1',
    unit:               (mapped.unit as any) || 'TON',
    status:             (mapped.status as any) || TripStatus.COMPLETED,
    priority:           (mapped.priority as any) || 'NORMAL',
    waste_manifest_no:  (mapped.waste_manifest_no as string) || undefined,
    delivery_note_no:   (mapped.delivery_note_no as string) || undefined,
    recycle_receipt_no: (mapped.recycle_receipt_no as string) || undefined,
    supervisor_name:    (mapped.supervisor_name as string) || undefined,
    gcm_supervisor_name:(mapped.gcm_supervisor_name as string) || undefined,
    container_size:     (mapped.container_size as string) || undefined,
    preferred_time:     (mapped.preferred_time as string) || undefined,
    facility_id:        (mapped.facility_id as string) || undefined,
    supplier_id:        (mapped.supplier_id as string) || undefined,
    notes:              (mapped.notes as string) || '',
    proof_images:       [],
  }),

  isUnchanged: (existing, mapped) =>
    existing.date       === mapped.date &&
    existing.project_id === mapped.project_id &&
    existing.service_id === mapped.service_id &&
    existing.status     === mapped.status,
};

// ─────────────────────────────────────────────
// Service Schema
// ─────────────────────────────────────────────

export const serviceSchema: ExcelSchema<Service> = {
  entityName: 'Service',
  idField: 'service_id',
  columns: [
    { header: 'Service ID',     field: 'service_id' },
    { header: 'Service Name',   field: 'service_name' },
    { header: 'Description',    field: 'service_description', default: '' },
    { header: 'Parent ID',      field: 'parent_id',           default: '' },
    {
      header: 'Category',
      field: 'category',
      default: 'GENERAL',
      transform: (v) => (['HAZARDOUS', 'GENERAL', 'WATER'].includes(v) ? v : 'GENERAL'),
    },
    { header: 'Major Category', field: 'major_category', default: '' },
    {
      header: 'Requires Recycle Receipt',
      field: 'requires_recycle_receipt',
      default: 'NO',
      transform: bool,
      exportTransform: yn,
    },
  ],

  buildEntity: (mapped) => ({
    service_id:             (mapped.service_id as string) || `SVC-${Date.now().toString().slice(-6)}`,
    service_name:           (mapped.service_name as string) || '',
    service_description:    (mapped.service_description as string) || '',
    parent_id:              (mapped.parent_id as string) || undefined,
    category:               (mapped.category as any) || 'GENERAL',
    major_category:         (mapped.major_category as string) || undefined,
    requires_recycle_receipt:(mapped.requires_recycle_receipt as boolean) || false,
  }),

  isUnchanged: (existing, mapped) =>
    existing.service_name === mapped.service_name &&
    existing.category     === mapped.category,
};

// ─────────────────────────────────────────────
// Supplier Schema
// ─────────────────────────────────────────────

export const supplierSchema: ExcelSchema<Supplier> = {
  entityName: 'Supplier',
  idField: 'supplier_id',
  columns: [
    { header: 'Supplier ID',    field: 'supplier_id' },
    { header: 'Name',           field: 'name' },
    { header: 'Trading Name',   field: 'trading_name',   default: '' },
    { header: 'CR No',          field: 'cr_no' },
    { header: 'Tax No',         field: 'tax_no',         default: '' },
    { header: 'Address',        field: 'address',        default: '' },
    {
      header: 'Status',
      field: 'status',
      default: 'ACTIVE',
      transform: (v) => (v === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'),
    },
    {
      header: 'Category',
      field: 'category',
      default: 'GENERAL',
      transform: (v) => (['VEHICLES', 'CONTAINERS', 'STAFF', 'GENERAL'].includes(v) ? v : 'GENERAL'),
    },
    { header: 'Payment Terms',  field: 'payment_terms',  default: '' },
    { header: 'Contract Start', field: 'contract_start', default: '' },
    { header: 'Contract End',   field: 'contract_end',   default: '' },
    { header: 'Work Start Date',field: 'work_start_date',default: '' },
    {
      header: 'Contact Persons',
      field: 'contact_persons',
      default: '',
      exportTransform: (v) => {
        if (!v) return '';
        const arr = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })() : v;
        if (!Array.isArray(arr)) return '';
        return arr.map((c: any) => `${c.name || ''}|${c.phone || ''}|${c.email || ''}|${c.role || ''}`).join('; ');
      },
      transform: (v) => {
        if (!v || typeof v !== 'string') return undefined;
        return v.split(';').map(entry => {
          const parts = entry.trim().split('|');
          return { name: parts[0] || '', phone: parts[1] || '', email: parts[2] || '', role: parts[3] || '' };
        }).filter(c => c.name);
      },
    },
    {
      header: 'Assigned Projects',
      field: 'assigned_projects',
      default: '',
      exportTransform: (v) => Array.isArray(v) ? v.join(', ') : '',
      transform: (v) => typeof v === 'string' ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
    {
      header: 'Assigned Services',
      field: 'assigned_services',
      default: '',
      exportTransform: (v) => Array.isArray(v) ? v.join(', ') : '',
      transform: (v) => typeof v === 'string' ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
  ],

  buildEntity: (mapped) => ({
    supplier_id:      (mapped.supplier_id as string) || `SUP-${Date.now().toString().slice(-6)}`,
    name:             (mapped.name as string) || '',
    trading_name:     (mapped.trading_name as string) || undefined,
    cr_no:            (mapped.cr_no as string) || '',
    tax_no:           (mapped.tax_no as string) || undefined,
    address:          (mapped.address as string) || undefined,
    status:           (mapped.status as any) || 'ACTIVE',
    category:         (mapped.category as any) || 'GENERAL',
    payment_terms:    (mapped.payment_terms as string) || undefined,
    contract_start:   (mapped.contract_start as string) || undefined,
    contract_end:     (mapped.contract_end as string) || undefined,
    work_start_date:  (mapped.work_start_date as string) || undefined,
    contact_persons:  (mapped.contact_persons as any) || undefined,
    assigned_projects:(mapped.assigned_projects as string[]) || undefined,
    assigned_services:(mapped.assigned_services as string[]) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.name   === mapped.name &&
    existing.cr_no  === mapped.cr_no &&
    existing.status === mapped.status,
};

// ─────────────────────────────────────────────
// Facility Schema
// ─────────────────────────────────────────────

export const facilitySchema: ExcelSchema<Facility> = {
  entityName: 'Facility',
  idField: 'facility_id',
  columns: [
    { header: 'Facility ID',    field: 'facility_id' },
    { header: 'Name',           field: 'name' },
    {
      header: 'Type',
      field: 'type',
      default: FacilityType.DISPOSAL,
      transform: (v) => (Object.values(FacilityType).includes(v as FacilityType) ? v : FacilityType.DISPOSAL),
    },
    { header: 'Contract No',    field: 'contract_no',    default: '' },
    { header: 'Contract Start', field: 'contract_start', default: '' },
    { header: 'Contract End',   field: 'contract_end',   default: '' },
    {
      header: 'Status',
      field: 'status',
      default: 'ACTIVE',
      transform: (v) => (v === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'),
    },
    { header: 'Location URL',   field: 'location_url',  default: '' },
    { header: 'Details',        field: 'details',        default: '' },
    {
      header: 'Accepted Services',
      field: 'accepted_services',
      default: '',
      exportTransform: (v) => Array.isArray(v) ? v.join(', ') : '',
      transform: (v) => typeof v === 'string' ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
  ],

  buildEntity: (mapped) => ({
    facility_id:      (mapped.facility_id as string) || `FAC-${Date.now().toString().slice(-6)}`,
    name:             (mapped.name as string) || '',
    type:             (mapped.type as any) || FacilityType.DISPOSAL,
    contract_no:      (mapped.contract_no as string) || undefined,
    contract_start:   (mapped.contract_start as string) || undefined,
    contract_end:     (mapped.contract_end as string) || undefined,
    status:           (mapped.status as any) || 'ACTIVE',
    location_url:     (mapped.location_url as string) || undefined,
    details:          (mapped.details as string) || undefined,
    accepted_services:(mapped.accepted_services as string[]) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.name   === mapped.name &&
    existing.type   === mapped.type &&
    existing.status === mapped.status,
};

// ─────────────────────────────────────────────
// User Schema (excludes sensitive fields)
// ─────────────────────────────────────────────

export const userSchema: ExcelSchema<User> = {
  entityName: 'User',
  idField: 'id',
  columns: [
    { header: 'User ID',        field: 'id' },
    { header: 'Name',           field: 'name' },
    { header: 'Email',          field: 'email' },
    { header: 'Phone',          field: 'phone',          default: '' },
    { header: 'Role',           field: 'role' },
    { header: 'Company ID',     field: 'company_id',     default: '' },
    { header: 'Project ID',     field: 'project_id',     default: '' },
    { header: 'Supplier ID',    field: 'supplier_id',    default: '' },
    { header: 'Vehicle ID',     field: 'vehicle_id',     default: '' },
  ],

  buildEntity: (mapped) => ({
    id:          (mapped.id as string) || `U-${Date.now().toString().slice(-6)}`,
    name:        (mapped.name as string) || '',
    email:       (mapped.email as string) || '',
    phone:       (mapped.phone as string) || undefined,
    role:        (mapped.role as any) || 'USER',
    company_id:  (mapped.company_id as string) || undefined,
    project_id:  (mapped.project_id as string) || undefined,
    supplier_id: (mapped.supplier_id as string) || undefined,
    vehicle_id:  (mapped.vehicle_id as string) || undefined,
  }),

  isUnchanged: (existing, mapped) =>
    existing.name  === mapped.name &&
    existing.email === mapped.email &&
    existing.role  === mapped.role,
};

// ─────────────────────────────────────────────
// Private Helpers — VehicleDocument flattening
// ─────────────────────────────────────────────

function _getDocField(
  docs: any[] | undefined,
  docType: string,
  fieldName: 'number' | 'expiry_date'
): string {
  if (!docs || !Array.isArray(docs)) return '';
  const doc = docs.find((d) => d.type === docType);
  return doc ? (doc[fieldName] || '') : '';
}

interface DocMapping {
  type: string;
  noCol: string;
  expiryCol: string;
  weight: number;
}

function _buildDocumentsFromRow(
  row: Record<string, any>,
  mappings: DocMapping[]
): any[] {
  const now = new Date().toISOString().split('T')[0] || '';

  return mappings
    .map((m) => {
      const number = row[m.noCol] || '';
      const expiry_date = row[m.expiryCol] || '';
      if (!number && !expiry_date) return null;

      let status = DocumentStatus.ACTIVE;
      if (expiry_date) {
        const diff = new Date(expiry_date).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) status = DocumentStatus.EXPIRED;
        else if (days <= 30) status = DocumentStatus.NEAR_EXPIRY;
      } else {
        status = DocumentStatus.EXPIRED;
      }

      return {
        id: `DOC-${m.type.replace(/\s+/g, '').toUpperCase()}-${Date.now()}`,
        type: m.type,
        number,
        expiry_date,
        status,
        progress_weight: m.weight,
        last_updated: now,
      };
    })
    .filter(Boolean);
}
