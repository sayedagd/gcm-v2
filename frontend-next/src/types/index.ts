
/**
 * [AR] ملف تعريف الأنواع (Types) والواجهات (Interfaces)
 * [EN] Core Type Definitions and Interfaces
 * 
 * [AR] الهدف: توفير تعريف موحد لكافة هياكل البيانات في النظام.
 * [EN] Goal: Provide unified definitions for all data structures in the system.
 */

/**
 * [AR] أدوار المستخدمين وصلاحيات الوصول
 * [EN] User Roles and Access Control levels
 */
export enum Role {
  ADMIN = 'ADMIN',             // [AR] مدير النظام - [EN] Master Admin
  USER = 'USER',              // [AR] مستخدم عام - [EN] Basic User
  COMPANY_USER = 'COMPANY_USER', // [AR] موظف شركة عميلة - [EN] Client Employee
  PROJECT_USER = 'PROJECT_USER', // [AR] مسؤول موقع - [EN] Site Supervisor
  ACCOUNTANT = 'ACCOUNTANT',    // [AR] محاسب مالي - [EN] Financial Auditor
  DATA_ENTRY = 'DATA_ENTRY',    // [AR] مدخل بيانات - [EN] Data Entry Clerk
  REPORTS_MANAGER = 'REPORTS_MANAGER', // [AR] مدير التقارير - [EN] Reports Manager
  LOGISTICS = 'LOGISTICS',     // [AR] مسؤول لوجستيات - [EN] Fleet Logistics Manager
  DRIVER = 'DRIVER',            // [AR] سائق - [EN] Driver
  CLIENT = 'CLIENT',            // [AR] عميل - [EN] Client Portal User
  SUBCONTRACTOR = 'SUBCONTRACTOR', // [AR] مورد خارجي - [EN] Subcontractor Portal User
  STAFF = 'STAFF',              // [AR] مشرف موقع (GCM) - [EN] GCM Site Supervisor
  DEACTIVATED = 'DEACTIVATED' // [AR] حساب معطل - [EN] Deactivated User Account
}

export interface PermitEntry {
  no: string;
  zone: string;
  expiry?: string;
  fileName?: string;
  fileData?: string; // Base64
}

/**
 * [AR] حالة الرحلة الميدانية
 * [EN] Status of a field trip
 */
export enum TripStatus {
  REQUESTED = 'REQUESTED',           // [AR] تم الطلب - [EN] Requested by Client
  ASSIGNED = 'ASSIGNED',             // [AR] تم التعيين - [EN] Logistics assigned a driver
  EN_ROUTE = 'EN_ROUTE',             // [AR] في الطريق - [EN] Driver accepted and heading to site
  LOADING = 'LOADING',               // [AR] جاري التحميل - [EN] Driver arrived and is loading
  PENDING_APPROVAL = 'PENDING_APPROVAL', // [AR] بانتظار موافقة العميل - [EN] Waiting for client confirmation
  IN_PROGRESS = 'IN_PROGRESS',       // [AR] قيد التنفيذ - [EN] Confirmed & In Progress
  PENDING_DOCS = 'PENDING_DOCS',     // [AR] في انتظار المستندات - [EN] Pending Documents/Signatures
  PENDING_REVIEW = 'PENDING_REVIEW', // [AR] بانتظار المراجعة - [EN] Pending Manager Review
  COMPLETED = 'COMPLETED',           // [AR] مكتمل - [EN] Completed & Archived
  CANCELLED = 'CANCELLED'            // [AR] ملغي - [EN] Cancelled
}

/**
 * [AR] أنواع الأنشطة في السجل
 * [EN] Action types for activity logging
 */
export enum ActionType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UPLOAD = 'UPLOAD',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT'
}

/**
 * [AR] أنواع الكيانات في النظام
 * [EN] Entity types for activity logging
 */
export enum EntityType {
  COMPANY = 'COMPANY',
  PROJECT = 'PROJECT',
  TRIP = 'TRIP',
  USER = 'USER',
  SERVICE = 'SERVICE',
  VEHICLE = 'VEHICLE',
  DRIVER = 'DRIVER',
  CONTAINER = 'CONTAINER',
  TANK = 'TANK',
  SIZE = 'SIZE',
  LANDING = 'LANDING',
  SUPPLIER = 'SUPPLIER',
  FACILITY = 'FACILITY',
  SCALE = 'SCALE'
}

/**
 * [AR] حالة طلب الصلاحية
 * [EN] Status of a permission request
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * [AR] أنواع الإشعارات
 * [EN] Types of system notifications
 */
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  OPERATIONAL = 'OPERATIONAL',
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  INFO = 'INFO'
}

/**
 * [AR] الواجهة البرمجية للإشعار
 * [EN] Notification interface structure
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  userId: string;
  targetUserId?: string;
  companyId?: string;
  projectId?: string;
  actionUrl?: string;
  link?: string;
}

/**
 * [AR] بيانات الشركة العميلة
 * [EN] Client Company data structure
 */
export interface Company {
  company_id: string;
  company_name: string;
  commercial_reg: string;
  contract_no?: string;
  details?: string;
  logo_url?: string;
  client_since: string;
  vat_no?: string;
  cr_file?: string;
  main_location_url?: string;
  billing_address?: string;
  contact_name?: string;
  user_id?: string;
  contact_phone?: string;
  contact_email?: string;
  vat_file?: string;
  national_address_file?: string;
}

/**
 * [AR] بيانات موقع المشروع
 * [EN] Project Site data structure
 */
export interface Project {
  project_id: string;
  project_name: string;
  company_id: string;
  service_ids: string[]; // Deprecated but kept for compatibility during transition
  location?: string;
  map_url?: string;
  po_number?: string;
  po_file?: string;
  details?: string;
  logo_url?: string;
  budget: number;
  total_quantities: number;
  assets: {
    large_containers: number;
    small_containers: number;
    compactors: number;
    other_assets?: string;
  };
  start_date: string;
  end_date: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  user_id?: string;
}

/**
 * [AR] ربط الخدمات بالمشاريع مع تتبع التكلفة والكمية
 * [EN] Link services to projects with cost and quantity tracking
 */
export interface ProjectService {
  id: string;
  project_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  progress_level: number;
  supplier_id?: string;
  cost_price?: number;
  warning_threshold?: number;
}

/**
 * [AR] هيكل تسعير الموردين للمشاريع
 * [EN] Supplier service rates for projects
 */
export interface SupplierRate {
  id: string;
  project_id: string;
  supplier_id: string;
  service_id: string;
  cost_price: number;
  currency: string;
}

/**
 * [AR] تعريف الخدمة أو المادة
 * [EN] Service or Material definition
 */
export interface Service {
  service_id: string;
  service_name: string;
  service_description: string;
  parent_id?: string;
  category?: 'HAZARDOUS' | 'GENERAL' | 'WATER';
  major_category?: string;
  requires_recycle_receipt?: boolean;
}

/**
 * [AR] حالة مستند المركبة
 * [EN] Vehicle Document Status
 */
export enum DocumentStatus {
  ACTIVE = 'ACTIVE',       // [AR] ساري - [EN] Valid
  NEAR_EXPIRY = 'NEAR_EXPIRY', // [AR] قارب على الانتهاء - [EN] Expiring soon (e.g. < 30 days)
  EXPIRED = 'EXPIRED'      // [AR] منتهي - [EN] Expired
}

/**
 * [AR] هيكل مستند المركبة
 * [EN] Vehicle Document Structure
 */
export interface VehicleDocument {
  id: string;
  type: string;          // e.g. 'Inspection Certificate', 'Emission Certificate'
  number: string;        // Document ID/Number
  expiry_date: string;   // YYYY-MM-DD
  status: DocumentStatus;
  progress_weight: number; // Contribution to total readiness (e.g., 25%)
  file_url?: string;     // URL to attached file if any
  fileData?: string;     // Base64 document image
  fileName?: string;     // Original filename
  last_updated?: string;
  updated_by?: string;   // User ID who last updated
}

/**
 * [AR] تعريف المركبة
 * [EN] Vehicle unit definition
 */
export interface Vehicle {
  vehicle_id: string;
  plate_no: string;
  vehicle_type: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  ownership_type: 'INTERNAL' | 'SUPPLIER';
  supplier_id?: string;
  supplier_name?: string;
  permit_count: number;
  permit_zones?: string;
  is_small_vehicle: boolean;
  documents?: VehicleDocument[]; // [AR] سجل المستندات - [EN] Document Registry
  photo_front?: string;           // [AR] صورة أمامية - [EN] Front view photo
  photo_back?: string;            // [AR] صورة خلفية - [EN] Back view photo
}

/**
 * [AR] تعريف السائق
 * [EN] Driver definition
 */
export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  license_no: string;
  license_file?: string;
  license_expiry?: string;
  iqama_no?: string;
  iqama_file?: string;
  iqama_expiry?: string;
  operating_card_no?: string;
  operating_card_expiry?: string;
  operating_card_file?: string;
  insurance_no?: string;
  insurance_expiry?: string;
  insurance_file?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  category: 'MANAGEMENT' | 'OPERATIONS';
  ownership_type: 'INTERNAL' | 'SUPPLIER';
  supplier_id?: string;
  supplier_name?: string;
  role_title?: string; // e.g., Driver, Accountant, Manager
  vehicle_id?: string;
  user_id?: string;
  permit_count?: number;
  permit_zones?: string; // JSON of PermitEntry[]
}

/**
 * [AR] تفاصيل الرد الميداني (الرحلة)
 * [EN] Field Trip / Log Entry details
 */
export interface Trip {
  trip_id: string;
  company_id: string;
  project_id: string;
  service_id: string;
  date: string;
  time: string;
  quantity: string;
  unit: 'TON' | 'KG' | 'CBM';
  container_size?: string;
  vehicle_id: string;
  driver_id: string;
  status: TripStatus;
  notes: string;
  waste_manifest_no?: string;
  delivery_note_no?: string;
  recycle_receipt_no?: string;
  manifest_file?: string;
  delivery_note_file?: string;
  recycle_file?: string;
  hub_link?: string;
  proof_images?: string[];
  supervisor_signature?: string;
  trip_location_url?: string;
  inventory_item_id?: string;
  supervisor_name?: string;
  gcm_supervisor_name?: string;
  facility_id?: string;
  subcontractor_id?: string;
  supplier_id?: string;
  is_manifest_generated?: boolean;
  is_delivery_note_generated?: boolean;
  client_signature?: string;          // [AR] توقيع العميل - [EN] Base64 client signature for this specific trip
  client_stamp?: string;              // [AR] ختم العميل - [EN] Base64 client stamp for this specific trip
  gcm_signature?: string;             // [AR] توقيع اعتماد GCM - [EN] Base64 GCM team signature
  gcm_stamp?: string;                 // [AR] ختم اعتماد GCM - [EN] Base64 GCM team stamp
  // --- Lifecycle Workflow Fields ---
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  container_image_before?: string;    // [AR] صورة الحاوية قبل التحميل - [EN] Base64 driver photo before loading
  container_image_after?: string;     // [AR] صورة الحاوية بعد التحميل - [EN] Base64 driver photo after loading
  client_approved?: boolean;          // [AR] موافقة العميل - [EN] Client confirmed trip completion
  client_approved_at?: string;        // [AR] وقت موافقة العميل - [EN] ISO timestamp of client approval
  assigned_at?: string;               // [AR] وقت التعيين - [EN] ISO timestamp when logistics assigned driver
  driver_accepted_at?: string;        // [AR] وقت قبول السائق - [EN] ISO timestamp when driver accepted
  request_location_url?: string;      // [AR] موقع GPS العميل عند الطلب - [EN] GPS captured by client on request
  request_container_image?: string;   // [AR] صورة الحاوية من العميل - [EN] Base64 client photo on request
  preferred_time?: string;            // [AR] الوقت المفضل - [EN] Client preferred time HH:mm
  issue_notes?: string;               // [AR] ملاحظات المشكلة - [EN] Filled when client raises an issue
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  company_id?: string;
  project_id?: string;
  supplier_id?: string;
  token?: string;
  phone?: string;
  signature?: string;                 // [AR] التوقيع الافتراضي - [EN] Base64 user signature
  stamp?: string;                     // [AR] الختم الافتراضي - [EN] Base64 user company stamp
  vehicle_id?: string;                // [AR] معرف المركبة - [EN] Associated vehicle ID (for drivers)
}

export interface SaaSConfig {
  appNameAr: string;
  appNameEn: string;
  appSloganAr: string;
  appSloganEn: string;
  primaryColor: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  language: 'ar' | 'en';
  cloudUrl?: string;
  apiConfig: {
    baseUrl: string;
    version: string;
    apiKey?: string;
    timeout: number;
  };
  landingPage: any;
  storePage?: any;
  bootConfig?: {
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    logoDuration?: number;
    showSlogan?: boolean;
    loadingTextAr?: string;
    loadingTextEn?: string;
  };
  aiAssistant?: {
    enabled: boolean;
    name?: string;
    nameAr?: string;
    position?: 'bottom-right' | 'bottom-left';
    iconStyle?: 'sparkles' | 'bot' | 'message' | 'zap';
    color?: string;
  };
  managementControlsEnabled?: boolean;
  templateConfig?: TemplateConfig;
  support_phone?: string;
  support_whatsapp?: string;
}

export interface ManifestTemplateConfig {
  headerTextAr?: string;
  headerTextEn?: string;
  footerTextAr?: string;
  footerTextEn?: string;
  showLogo?: boolean;
  showSignatures?: boolean;
  logoOverride?: string;
}

export interface DeliveryNoteTemplateConfig {
  headerTextAr?: string;
  headerTextEn?: string;
  footerTextAr?: string;
  footerTextEn?: string;
  showLogo?: boolean;
  showQR?: boolean;
  showSignatures?: boolean;
  logoOverride?: string;
}

export interface GlobalTemplateConfig {
  headerTextAr?: string;
  headerTextEn?: string;
  footerTextAr?: string;
  footerTextEn?: string;
  logoOverride?: string;
  gcmStampOverride?: string; // Add this line
  accentColor?: string;
}

export interface TemplateConfig {
  manifest?: ManifestTemplateConfig;
  deliveryNote?: DeliveryNoteTemplateConfig;
  global?: GlobalTemplateConfig;
}

export interface PermissionRequest {
  id: string;
  email: string;
  fromLocation: string;
  notes: string;
  mobile?: string;
  role?: string;        // [AR] الدور المطلوب (STAFF, CLIENT, SUBCONTRACTOR)
  companyName?: string; // [AR] اسم الشركة/الجهة
  status: RequestStatus;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  action: ActionType;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  details: string;
  timestamp: string;
  user_id: string;
}

export interface UserPresence {
  userId: string;
  userName?: string;
  lastActive: string;
  currentPage: string;
}

/**
 * [AR] سجل الصيانة للأصول
 * [EN] Asset Maintenance Log
 */
export interface MaintenanceLog {
  id: string;
  date: string;
  notes: string;
  photo_url?: string;
  performed_by?: string;
}

/**
 * [AR] تعريفات المخزون
 * [EN] Inventory Definitions
 */
export interface Container {
  container_id: string;
  code: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  ownership: 'OWN' | 'SUPPLIER';
  supplier_id?: string;
  supplier_name?: string;
  size_id: string;
  project_id?: string;
  gps_location?: string;
  purchase_date?: string;
  maintenance_logs?: MaintenanceLog[];
  doc_file?: string;
}

export interface Tank {
  tank_id: string;
  code: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  ownership: 'OWN' | 'SUPPLIER';
  supplier_id?: string;
  supplier_name?: string;
  size_id: string;
  project_id?: string;
  gps_location?: string;
  purchase_date?: string;
  maintenance_logs?: MaintenanceLog[];
  doc_file?: string;
}

export interface Scale {
  scale_id: string;
  code: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  ownership: 'OWN' | 'SUPPLIER';
  supplier_id?: string;
  supplier_name?: string;
  size_id?: string; // Optional for scale
  project_id?: string;
  gps_location?: string;
  purchase_date?: string;
  maintenance_logs?: MaintenanceLog[];
  doc_file?: string;
}

export interface InventorySize {
  size_id: string;
  name: string;
  type: 'CONTAINER' | 'TANK' | 'SCALE';
}

export interface SupplierContact {
  name: string;
  phone: string;
  email: string;
  role: string;
}

/**
 * [AR] بيانات الموردين (منفصلة عن العملاء)
 * [EN] Supplier data structure (Separated from clients)
 */
export interface Supplier {
  supplier_id: string;
  name: string;
  trading_name?: string;
  cr_no: string;
  cr_file?: string;
  tax_no?: string;
  tax_file?: string;
  contact_persons?: string | SupplierContact[]; // [AR] جهات الاتصال - [EN] Contacts
  address?: string;
  contract_file?: string;
  status: 'ACTIVE' | 'INACTIVE';
  payment_terms?: string;
  category: 'VEHICLES' | 'CONTAINERS' | 'STAFF' | 'GENERAL';
  created_at?: string;
  contract_start?: string;
  contract_end?: string;
  work_start_date?: string;
  assigned_projects?: string[]; // Array of project_ids
  assigned_services?: string[]; // Array of service_ids
  user_id?: string;
}

/**
 * [AR] أنواع المرافق المعالجة
 * [EN] Facility / Discharge Site Types
 */
export enum FacilityType {
  DISPOSAL = 'DISPOSAL',           // [AR] مكب النفايات - [EN] Landfill / Disposal
  RECYCLE = 'RECYCLE',             // [AR] مركز إعادة التدوير - [EN] Recycling Center
  SEWAGE_TREATMENT = 'SEWAGE_TREATMENT'  // [AR] محطة معالجة الصرف - [EN] Sewage Treatment
}

/**
 * [AR] بيانات المرافق الرسمية
 * [EN] Official Facility / Discharge Site data
 */
export interface Facility {
  facility_id: string;
  name: string;
  type: FacilityType;
  contract_no?: string;
  contract_file?: string;
  contract_start?: string;
  contract_end?: string;
  accepted_services?: string[]; // [AR] الخدمات المقبولة - [EN] Accepted Service IDs
  location_url?: string;
  status: 'ACTIVE' | 'INACTIVE';
  details?: string;
}

/**
 * [AR] حالات جلسة الذكاء الاصطناعي
 * [EN] AI Session Status
 */
export enum AISessionStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  REPORT_ONLY = 'report_only'
}

/**
 * [AR] أنواع الإجراءات في جلسة الذكاء الاصطناعي
 * [EN] AI Session Action Types
 */
export enum AIActionType {
  REGISTER_TRIP = 'register_trip',
  REPORT = 'report',
  EDIT = 'edit',
  GENERAL = 'general'
}

/**
 * [AR] جلسة تفاعل مع الذكاء الاصطناعي
 * [EN] AI Interaction Session
 */
export interface AISession {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action_type: string;
  language: string;
  status: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  trip_reference?: string;
  error_message?: string;
  trip_data_summary?: Record<string, any>;
  rating?: number;
  ai_confidence_score?: number;
  flagged: boolean;
  ip_address?: string;
  messages?: AIMessage[];
}

/**
 * [AR] رسالة ضمن جلسة الذكاء الاصطناعي
 * [EN] Message within an AI Session
 */
export interface AIMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai' | 'system';
  message: string;
  timestamp: string;
}

/**
 * [AR] إحصائيات جلسات الذكاء الاصطناعي
 * [EN] AI Session Analytics
 */
export interface AIAnalytics {
  total_sessions: number;
  success_rate: number;
  avg_duration_seconds: number;
  by_action_type: { action_type: string; count: string }[];
  by_status: { status: string; count: string }[];
  top_users: { user_name: string; user_role: string; session_count: string }[];
  common_errors: { error_message: string; count: string }[];
}
/**
 * [AR] طلب إضافة أصل (سائق، مركبة، الخ)
 * [EN] Asset addition request (Driver, Vehicle, etc.)
 */
export interface AssetRequest {
  id: string | number;
  supplier_id: string;
  type: 'VEHICLE' | 'DRIVER' | 'CONTAINER' | 'TANK';
  data: any;
  status: RequestStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * [AR] ربط الأصول بالخدمات (N:N)
 * [EN] Asset ↔ Service link (Many-to-Many junction)
 */
export interface AssetServiceLink {
  id?: number;
  asset_type: 'VEHICLE' | 'CONTAINER' | 'TANK';
  asset_id: string;
  service_id: string;
  created_at?: string;
}
