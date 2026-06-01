-- ========================================================
-- GCM ERP - FRESH SYSTEM INITIALIZATION (2026)
-- [AR] ملف التثبيت النظيف - يمسح كل البيانات وينشئ النظام من الصفر
-- [EN] Clean System Init - Drops everything and starts fresh
-- ========================================================

-- 1. CLEANUP EVERYTHING
-- ========================================================
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_sessions CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS project_services CASCADE;
DROP TABLE IF EXISTS project_supplier_rates CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS containers CASCADE;
DROP TABLE IF EXISTS tanks CASCADE;
DROP TABLE IF EXISTS inventory_sizes CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS permission_requests CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS saas_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- 2. CREATE SCHEMA (RELATIONAL ORDER)
-- ========================================================

CREATE TABLE companies (
    company_id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    commercial_reg VARCHAR(100),
    contract_no VARCHAR(100),
    details TEXT,
    logo_url TEXT,
    client_since DATE,
    vat_no VARCHAR(50),
    cr_file TEXT,
    main_location_url TEXT,
    billing_address TEXT,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    website_url TEXT,
    vat_file TEXT,
    national_address_file TEXT
);

CREATE TABLE services (
    service_id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    service_description TEXT,
    parent_id VARCHAR(50) REFERENCES services(service_id)
);

CREATE TABLE projects (
    project_id VARCHAR(50) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    company_id VARCHAR(50) REFERENCES companies(company_id),
    location TEXT,
    map_url TEXT,
    po_number VARCHAR(100),
    po_file TEXT,
    details TEXT,
    logo_url TEXT,
    start_date DATE,
    end_date DATE,
    budget NUMERIC DEFAULT 0,
    total_quantities NUMERIC DEFAULT 0,
    assets_large_containers INTEGER DEFAULT 0,
    assets_small_containers INTEGER DEFAULT 0,
    assets_compactors INTEGER DEFAULT 0,
    assets_other TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE project_services (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES services(service_id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    progress_level NUMERIC DEFAULT 0
);

CREATE TABLE suppliers (
    supplier_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    cr_no VARCHAR(50),
    tax_no VARCHAR(50),
    contact_persons JSONB,
    address TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cr_file TEXT,
    tax_file TEXT,
    contract_file TEXT,
    payment_terms TEXT
);

CREATE TABLE vehicles (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    plate_no VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(100),
    status VARCHAR(50),
    ownership_type VARCHAR(50) DEFAULT 'INTERNAL',
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id),
    supplier_name VARCHAR(255),
    permit_count INTEGER DEFAULT 0,
    is_small_vehicle BOOLEAN DEFAULT FALSE,
    permit_zones JSONB
);

CREATE TABLE drivers (
    driver_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    license_no VARCHAR(100),
    iqama_no VARCHAR(100),
    status VARCHAR(50),
    ownership_type VARCHAR(50) DEFAULT 'INTERNAL',
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id),
    supplier_name VARCHAR(255),
    category VARCHAR(50),
    license_file TEXT,
    iqama_file TEXT
);

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT,
    role VARCHAR(50),
    avatar TEXT,
    company_id VARCHAR(50) REFERENCES companies(company_id),
    project_id VARCHAR(50) REFERENCES projects(project_id),
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id)
);

CREATE TABLE trips (
    trip_id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id),
    service_id VARCHAR(50) REFERENCES services(service_id),
    date DATE,
    time VARCHAR(20),
    quantity NUMERIC(10,2),
    unit VARCHAR(20),
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    driver_id VARCHAR(50) REFERENCES drivers(driver_id),
    status VARCHAR(50),
    notes TEXT,
    waste_manifest_no VARCHAR(100),
    delivery_note_no VARCHAR(100),
    recycle_receipt_no VARCHAR(100),
    manifest_file TEXT,
    delivery_note_file TEXT,
    recycle_file TEXT,
    proof_images JSONB,
    trip_location_url TEXT,
    supervisor_name VARCHAR(255)
);

CREATE TABLE inventory_sizes (
    size_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50)
);

CREATE TABLE containers (
    container_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50),
    ownership VARCHAR(100),
    size_id VARCHAR(50) REFERENCES inventory_sizes(size_id),
    project_id VARCHAR(50) REFERENCES projects(project_id),
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id),
    supplier_name VARCHAR(255),
    doc_file TEXT
);

CREATE TABLE tanks (
    tank_id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    status VARCHAR(50),
    ownership VARCHAR(100),
    size_id VARCHAR(50) REFERENCES inventory_sizes(size_id),
    project_id VARCHAR(50) REFERENCES projects(project_id),
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id),
    supplier_name VARCHAR(255),
    doc_file TEXT
);

CREATE TABLE activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50) REFERENCES users(id)
);

CREATE TABLE permission_requests (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    from_location TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_submissions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saas_config (
    id VARCHAR(10) PRIMARY KEY DEFAULT 'SINGLETON',
    app_name_ar VARCHAR(255),
    app_name_en VARCHAR(255),
    app_slogan_ar VARCHAR(255),
    app_slogan_en VARCHAR(255),
    primary_color VARCHAR(50),
    logo_url TEXT,
    logo_dark_url TEXT,
    language VARCHAR(10),
    landing_page JSONB,
    CHECK (id = 'SINGLETON')
);

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    user_id VARCHAR(50) REFERENCES users(id)
);

CREATE TABLE project_supplier_rates (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    supplier_id VARCHAR(50) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES services(service_id) ON DELETE CASCADE,
    cost_price NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'SAR',
    UNIQUE(project_id, supplier_id, service_id)
);

-- 3. AI SESSION TRACKING
-- ========================================================

CREATE TABLE ai_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action_type VARCHAR(50) DEFAULT 'general',
    language VARCHAR(10) DEFAULT 'ar',
    status VARCHAR(20) DEFAULT 'completed',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    trip_reference VARCHAR(50),
    error_message TEXT,
    trip_data_summary JSONB,
    rating SMALLINT,
    ai_confidence_score NUMERIC(3,2),
    flagged BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45)
);

CREATE TABLE ai_messages (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES ai_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_sessions_user ON ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_status ON ai_sessions(status);
CREATE INDEX idx_ai_sessions_started ON ai_sessions(started_at);
CREATE INDEX idx_ai_messages_session ON ai_messages(session_id);

-- 4. SEED CORE DATA
-- ========================================================

-- Root Service Categories
INSERT INTO services (service_id, service_name, service_description) VALUES 
('CAT-NH', 'Non-Hazardous waste', 'Non-Hazardous Waste Categories'),
('CAT-H', 'Hazardous waste', 'Hazardous Waste Categories'),
('CAT-W', 'Supplying water', 'Water Supply Services');

-- Non-Hazardous Waste Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('NH-01', 'Paper', 'Non-Hazardous', 'CAT-NH'),
('NH-02', 'Cardboard', 'Non-Hazardous', 'CAT-NH'),
('NH-03', 'Wood', 'Non-Hazardous', 'CAT-NH'),
('NH-04', 'Plastic', 'Non-Hazardous', 'CAT-NH'),
('NH-05', 'Metal / Steel', 'Non-Hazardous', 'CAT-NH'),
('NH-06', 'Concrete', 'Non-Hazardous', 'CAT-NH'),
('NH-07', 'Food Waste', 'Non-Hazardous', 'CAT-NH'),
('NH-08', 'General Waste', 'Non-Hazardous', 'CAT-NH'),
('NH-09', 'Asphalt', 'Non-Hazardous', 'CAT-NH'),
('NH-10', 'Glass', 'Non-Hazardous', 'CAT-NH'),
('NH-11', 'Excavated Material', 'Non-Hazardous', 'CAT-NH'),
('NH-12', 'Electronic (specify)', 'Non-Hazardous', 'CAT-NH');

-- Hazardous Waste Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('H-01', 'Oils / Fuels / Oily Water', 'Hazardous', 'CAT-H'),
('H-02', 'Tires', 'Hazardous', 'CAT-H'),
('H-03', 'Concrete Wash Water', 'Hazardous', 'CAT-H'),
('H-04', 'Sewage', 'Hazardous', 'CAT-H'),
('H-05', 'Contaminated Material', 'Hazardous', 'CAT-H'),
('H-06', 'Contaminated Soil', 'Hazardous', 'CAT-H'),
('H-07', 'Rags / Drums / Filters', 'Hazardous', 'CAT-H'),
('H-08', 'Batteries', 'Hazardous', 'CAT-H'),
('H-09', 'Asbestos', 'Hazardous', 'CAT-H'),
('H-10', 'Medical', 'Hazardous', 'CAT-H'),
('H-11', 'Electronic (specify)', 'Hazardous', 'CAT-H'),
('H-12', 'Other (    )', 'Hazardous', 'CAT-H');

-- Water Supply Services
INSERT INTO services (service_id, service_name, service_description, parent_id) VALUES 
('W-01', 'Sweet water', 'Supplying water', 'CAT-W'),
('W-02', 'Drinking water', 'Supplying water', 'CAT-W'),
('W-03', 'Dust control', 'Supplying water', 'CAT-W');

-- Basic Inventory Sizes
-- Basic Inventory Sizes
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-6', '6 Yards', 'CONTAINER');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-12', '12 Yards', 'CONTAINER');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-20', '20 Yards', 'CONTAINER');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-30', '30 Yards', 'CONTAINER');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-C20', '20 Yards Compactor', 'CONTAINER');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-T5', '5000 Gallons', 'TANK');
INSERT INTO inventory_sizes (size_id, name, type) VALUES ('SZ-T10', '10000 Gallons', 'TANK');

-- INITIAL ADMIN USER
INSERT INTO users (id, name, email, password, role, avatar) VALUES 
('U_ADMIN', 'Yusuf Engineer', 'eng-yusuf@gcm-gulf.com', '$2a$10$qDxq2FbPQDoAc/xTfEOoZ.2dVk7kOkBB6dsY8hvKk6wDLGtrCU4nwS', 'ADMIN', '');

-- Default SaaS Config
INSERT INTO saas_config (id, app_name_ar, app_name_en, primary_color) 
VALUES ('SINGLETON', 'GCM للخدمات البيئية', 'GCM Eco Services', '#10b981');
