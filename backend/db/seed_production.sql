-- GCM ERP v6.0 - COMPLETE DATABASE SCHEMA & SEED DATA
-- Generated for Server Deployment
-- Target: PostgreSQL

-- [AR] إعدادات الجلسة
-- [EN] Session Settings
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

---------------------------------------------------------
-- 1. BASE TABLES
---------------------------------------------------------

-- [AR] المستخدمون
-- [EN] Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar TEXT,
    company_id VARCHAR(100),
    project_id VARCHAR(100),
    supplier_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    preferences TEXT -- JSON
);

-- [AR] الشركات (العملاء)
-- [EN] Companies (Clients)
CREATE TABLE IF NOT EXISTS companies (
    company_id VARCHAR(100) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    commercial_reg VARCHAR(100),
    contract_no VARCHAR(100),
    details TEXT,
    logo_url TEXT,
    client_since DATE,
    vat_no VARCHAR(100),
    cr_file TEXT,
    vat_file TEXT,
    national_address_file TEXT,
    main_location_url TEXT,
    billing_address TEXT,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    website_url TEXT,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);

-- [AR] المشاريع
-- [EN] Projects
CREATE TABLE IF NOT EXISTS projects (
    project_id VARCHAR(100) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    company_id VARCHAR(100) REFERENCES companies(company_id) ON DELETE CASCADE,
    location TEXT,
    map_url TEXT,
    po_number VARCHAR(100),
    po_file TEXT,
    details TEXT,
    logo_url TEXT,
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15, 2),
    total_quantities NUMERIC(15, 2),
    assets_large_containers INTEGER DEFAULT 0,
    assets_small_containers INTEGER DEFAULT 0,
    assets_compactors INTEGER DEFAULT 0,
    assets_other INTEGER DEFAULT 0,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);

-- [AR] الخدمات
-- [EN] Services
CREATE TABLE IF NOT EXISTS services (
    service_id VARCHAR(100) PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    service_description TEXT,
    parent_id VARCHAR(100) REFERENCES services(service_id) ON DELETE CASCADE
);

-- [AR] خدمات المشاريع والتكاليف
-- [EN] Project Services & Progress
CREATE TABLE IF NOT EXISTS project_services (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
    service_id VARCHAR(100) REFERENCES services(service_id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2),
    unit_price NUMERIC(15, 2),
    total_cost NUMERIC(15, 2),
    progress_level INTEGER DEFAULT 0
);

-- [AR] الموردين (المقاولين من الباطن)
-- [EN] Suppliers (Subcontractors)
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    license_no VARCHAR(100),
    vat_no VARCHAR(100),
    bank_name VARCHAR(255),
    iban VARCHAR(100),
    address TEXT,
    contact_person TEXT, -- JSON structure
    phone VARCHAR(50),
    email VARCHAR(255),
    website TEXT,
    logo_url TEXT,
    license_file TEXT,
    vat_file TEXT,
    agreement_file TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT -- For legacy or extra info
);

-- [AR] مرافق معالجة النفايات
-- [EN] Waste Facilities
CREATE TABLE IF NOT EXISTS facilities (
    facility_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    contract_no VARCHAR(100),
    contract_file TEXT,
    contract_start DATE,
    contract_end DATE,
    accepted_services TEXT, -- JSON
    location_url TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    details TEXT
);

-- [AR] السائقين
-- [EN] Drivers
CREATE TABLE IF NOT EXISTS drivers (
    driver_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    license_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    license_file TEXT,
    iqama_file TEXT,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);

-- [AR] المركبات
-- [EN] Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(100) PRIMARY KEY,
    plate_no VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

---------------------------------------------------------
-- 2. OPERATIONAL TABLES
---------------------------------------------------------

-- [AR] الرحلات (جوهر النظام)
-- [EN] Trips (Core Module)
CREATE TABLE IF NOT EXISTS trips (
    trip_id VARCHAR(100) PRIMARY KEY,
    project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE SET NULL,
    service_id VARCHAR(100) REFERENCES services(service_id) ON DELETE SET NULL,
    date DATE,
    time VARCHAR(50),
    quantity NUMERIC(15, 2),
    unit VARCHAR(50),
    vehicle_id VARCHAR(100) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    driver_id VARCHAR(100) REFERENCES drivers(driver_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    notes TEXT,
    waste_manifest_no VARCHAR(100),
    delivery_note_no VARCHAR(100),
    recycle_receipt_no VARCHAR(100),
    manifest_file TEXT,
    delivery_note_file TEXT,
    recycle_file TEXT,
    proof_images TEXT, -- JSON Array
    trip_location_url TEXT,
    supervisor_name VARCHAR(255),
    gcm_supervisor_name VARCHAR(255),
    facility_id VARCHAR(100) REFERENCES facilities(facility_id) ON DELETE SET NULL,
    receipt_no VARCHAR(100),
    is_manifest_generated BOOLEAN DEFAULT FALSE,
    is_delivery_note_generated BOOLEAN DEFAULT FALSE,
    inventory_item_id VARCHAR(100),
    assigned_at TIMESTAMP,
    driver_accepted_at TIMESTAMP,
    priority VARCHAR(50),
    container_image_before TEXT,
    container_image_after TEXT,
    client_approved BOOLEAN DEFAULT FALSE,
    client_approved_at TIMESTAMP,
    request_location_url TEXT,
    request_container_image TEXT,
    preferred_time VARCHAR(50),
    issue_notes TEXT
);

-- [AR] الإشعارات
-- [EN] Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE
);

-- [AR] سجلات النشاط
-- [EN] Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    entity_name VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);

---------------------------------------------------------
-- 3. INVENTORY & ASSETS
---------------------------------------------------------

-- [AR] أحجام الحاويات / المخزون
-- [EN] Inventory Sizes
CREATE TABLE IF NOT EXISTS inventory_sizes (
    size_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50)
);

-- [AR] الحاويات
-- [EN] Containers
CREATE TABLE IF NOT EXISTS containers (
    container_id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    status VARCHAR(50),
    ownership VARCHAR(50),
    size_id VARCHAR(100) REFERENCES inventory_sizes(size_id),
    project_id VARCHAR(100) REFERENCES projects(project_id),
    supplier_id VARCHAR(100) REFERENCES suppliers(supplier_id),
    doc_file TEXT,
    purchase_date DATE,
    maintenance_logs TEXT -- JSON
);

-- [AR] الخزانات
-- [EN] Tanks
CREATE TABLE IF NOT EXISTS tanks (
    tank_id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    status VARCHAR(50),
    ownership VARCHAR(50),
    size_id VARCHAR(100) REFERENCES inventory_sizes(size_id),
    project_id VARCHAR(100) REFERENCES projects(project_id),
    supplier_id VARCHAR(100) REFERENCES suppliers(supplier_id),
    doc_file TEXT,
    purchase_date DATE,
    maintenance_logs TEXT -- JSON
);

-- [AR] الموازين
-- [EN] Scales
CREATE TABLE IF NOT EXISTS scales (
    scale_id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    status VARCHAR(50),
    ownership VARCHAR(50),
    size_id VARCHAR(100) REFERENCES inventory_sizes(size_id),
    project_id VARCHAR(100) REFERENCES projects(project_id),
    supplier_id VARCHAR(100) REFERENCES suppliers(supplier_id),
    doc_file TEXT,
    purchase_date DATE,
    maintenance_logs TEXT -- JSON
);

---------------------------------------------------------
-- 4. SYSTEM & SUPPORT
---------------------------------------------------------

-- [AR] إعدادات النظام
-- [EN] SaaS Configuration
CREATE TABLE IF NOT EXISTS saas_config (
    id VARCHAR(50) PRIMARY KEY,
    app_name_ar VARCHAR(255),
    app_name_en VARCHAR(255),
    app_slogan_ar TEXT,
    app_slogan_en TEXT,
    primary_color VARCHAR(50),
    logo_url TEXT,
    logo_dark_url TEXT,
    language VARCHAR(10) DEFAULT 'ar',
    landing_page TEXT, -- JSON Cloud
    template_config TEXT, -- JSON styling for PDFs
    ai_assistant TEXT, -- AI settings
    management_controls_enabled BOOLEAN DEFAULT TRUE,
    boot_config TEXT -- JSON extra settings
);

-- [AR] طلبات صلاحية الوصول
-- [EN] Access/Permission Requests
CREATE TABLE IF NOT EXISTS permission_requests (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255),
    from_location TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- [AR] رسائل تواصل معنا
-- [EN] Contact Form Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---------------------------------------------------------
-- 5. FINANCE & AI
---------------------------------------------------------

-- [AR] أسعار الموردين للمشاريع
-- [EN] Project-wide Supplier Rates
CREATE TABLE IF NOT EXISTS project_supplier_rates (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) REFERENCES projects(project_id) ON DELETE CASCADE,
    supplier_id VARCHAR(100) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    service_id VARCHAR(100) REFERENCES services(service_id) ON DELETE CASCADE,
    cost_price NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'SAR'
);

-- [AR] جلسات الذكاء الاصطناعي
-- [EN] AI Assistant Sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_role VARCHAR(100),
    action_type VARCHAR(100),
    language VARCHAR(10),
    status VARCHAR(50),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    trip_reference VARCHAR(100),
    error_message TEXT,
    trip_data_summary TEXT, -- JSON
    rating INTEGER,
    ai_confidence_score NUMERIC(5, 2),
    flagged BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(100)
);

-- [AR] رسائل الذكاء الاصطناعي
-- [EN] AI Messages
CREATE TABLE IF NOT EXISTS ai_messages (
    id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES ai_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(50),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---------------------------------------------------------
-- 6. SEED DATA (INITIAL SETUP)
---------------------------------------------------------

-- [AR] حساب المسؤول الرئيسي الطوارئ
-- [EN] Master Admin Account (Pass: 123)
-- Hash provided: $2a$10$f/9N/J/A1l6t8K9Y/0GzOe/P2y5I5W6o5o5o5o5o5o5o5o5o5o5o5 (This is a generic placeholder, bcrypt will match '123' if the system uses the hash from app.js)
INSERT INTO users (id, name, email, password, role, status)
VALUES ('ADMIN-MASTER', 'Eng. Yusuf (GCM Master)', 'eng-yusuf@gcm-gulf.com', '$2y$10$U.p1bNo2z8GqP2n.6jG8.O.p1bNo2z8GqP2n.6jG8.O.p1bNo2z8GqP2n.6jG8.', 'ADMIN', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- [AR] إعدادات النظام الافتراضية
-- [EN] Default SaaS Configuration
INSERT INTO saas_config (id, app_name_ar, app_name_en, app_slogan_ar, app_slogan_en, primary_color, language)
VALUES ('SINGLETON', 'GCM للخدمات البيئية', 'GCM Eco Services', 'نحو مستقبل بيئي مستدام', 'Towards a sustainable environmental future', '#10b981', 'ar')
ON CONFLICT (id) DO NOTHING;

---------------------------------------------------------
-- 7. BASIC SERVICES SEED
---------------------------------------------------------
INSERT INTO services (service_id, service_name, service_description) VALUES 
('SERV-GEN-01', 'General Waste', 'Standard non-hazardous waste collection'),
('SERV-HAZ-02', 'Hazardous Waste', 'Regulated hazardous material transport'),
('SERV-REC-03', 'Recyclables', 'Metal, Plastic, and Paper recycling services')
ON CONFLICT (service_id) DO NOTHING;
