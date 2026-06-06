
import { Company, Project, Trip, Role, User, ActivityLog, ActionType, EntityType, Service, TripStatus, Vehicle, Driver, Supplier } from '@/types';

export const SAMPLE_VEHICLES: Vehicle[] = [
  { vehicle_id: 'V1', plate_no: 'أ ب ج 1234', vehicle_type: 'Hook Lift', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 5, is_small_vehicle: false },
  { vehicle_id: 'V2', plate_no: 'د هـ و 5678', vehicle_type: 'Compactor', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 3, is_small_vehicle: false },
  { vehicle_id: 'V3', plate_no: 'ز ح ط 9012', vehicle_type: 'Water Tanker', status: 'MAINTENANCE', ownership_type: 'INTERNAL', permit_count: 2, is_small_vehicle: false },
  { vehicle_id: 'V4', plate_no: 'س ص ع 4433', vehicle_type: 'Hook Lift', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 4, is_small_vehicle: false },
  { vehicle_id: 'V5', plate_no: 'ط ك ل 1122', vehicle_type: 'Compactor', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 6, is_small_vehicle: false },
  { vehicle_id: 'V6', plate_no: 'ر ن م 9988', vehicle_type: 'Hook Lift', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 2, is_small_vehicle: false },
  { vehicle_id: 'V7', plate_no: 'ق ث ص 2211', vehicle_type: 'Compactor', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 3, is_small_vehicle: false },
  { vehicle_id: 'V8', plate_no: 'ح ل م 3344', vehicle_type: 'Skip Loader', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 1, is_small_vehicle: true },
  { vehicle_id: 'V9', plate_no: 'ص ب ر 7766', vehicle_type: 'Hook Lift', status: 'INACTIVE', ownership_type: 'INTERNAL', permit_count: 0, is_small_vehicle: false },
  { vehicle_id: 'V10', plate_no: 'ق م ر 5544', vehicle_type: 'Crane Truck', status: 'ACTIVE', ownership_type: 'INTERNAL', permit_count: 4, is_small_vehicle: false },
];

export const SAMPLE_DRIVERS: Driver[] = [
  { driver_id: 'D1', name: 'Ahmed', phone: '0501234567', license_no: 'LIC-9988', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver', user_id: 'U_DRV', iqama_no: '2345678901', iqama_expiry: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0] || '', license_expiry: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] || '' },
  { driver_id: 'D2', name: 'محمد علي', phone: '0559876543', license_no: 'LIC-7766', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'D3', name: 'ياسين حسن', phone: '0562233445', license_no: 'LIC-5544', status: 'ON_LEAVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'D4', name: 'خالد الفهد', phone: '0544332211', license_no: 'LIC-1122', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'D5', name: 'سلطان القحطاني', phone: '0533445566', license_no: 'LIC-3344', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'D6', name: 'عصام كمال', phone: '0599112233', license_no: 'LIC-4455', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'D7', name: 'فهد الرشيدي', phone: '0588443322', license_no: 'LIC-6677', status: 'ACTIVE', category: 'OPERATIONS', ownership_type: 'INTERNAL', role_title: 'Driver' },
  { driver_id: 'M1', name: 'م. ياسر القحطاني', phone: '0511223344', license_no: '', status: 'ACTIVE', category: 'MANAGEMENT', ownership_type: 'INTERNAL', role_title: 'Admin Manager' },
];

export const SAMPLE_SUPPLIERS: Supplier[] = [
  {
    supplier_id: 'SUP1',
    name: 'Al-Majd Transport',
    trading_name: 'المجد للنقليات',
    cr_no: '1010776655',
    contact_persons: JSON.stringify([{ name: 'Samer Al-Majd', phone: '0501112223', email: 'samer@al-majd.com', role: 'Owner' }]),
    status: 'ACTIVE',
    category: 'VEHICLES'
  },
  {
    supplier_id: 'SUP2',
    name: 'EcoBin Solutions',
    trading_name: 'إيكو بن للحلول البيئية',
    cr_no: '2020883311',
    contact_persons: JSON.stringify([{ name: 'John Doe', phone: '0544112233', email: 'john@ecobin.com', role: 'Sales' }]),
    status: 'ACTIVE',
    category: 'CONTAINERS'
  }
];

export const SAMPLE_COMPANIES: Company[] = [
  {
    company_id: 'C1',
    company_name: 'NEOM Construction Group',
    commercial_reg: '1010887211',
    contract_no: 'PO-NEOM-2024',
    details: 'Primary contractor for THE LINE project.',
    logo_url: '/logo.png',
    client_since: '2020-01-01'
  },
  {
    company_id: 'C2',
    company_name: 'Red Sea Global (RSG)',
    commercial_reg: '2020551234',
    contract_no: 'CONT-RSG-88',
    details: 'Tourism development environmental partner.',
    logo_url: '/logo.png',
    client_since: '2021-05-15'
  },
  {
    company_id: 'C3',
    company_name: 'Qiddiya Investment Co.',
    commercial_reg: '1010443322',
    contract_no: 'PO-QID-992',
    details: 'Entertainment city waste management.',
    logo_url: '/logo.png',
    client_since: '2022-08-10'
  },
  {
    company_id: 'C4',
    company_name: 'Al-Futtaim Engineering',
    commercial_reg: '1010229988',
    contract_no: 'AF-GCM-2024',
    details: 'Mechanical and Electrical infrastructure partner.',
    logo_url: '/logo.png',
    client_since: '2023-11-20'
  },
  {
    company_id: 'C5',
    company_name: 'Saudi Binladin Group',
    commercial_reg: '4030112233',
    contract_no: 'SBG-GCM-L4',
    details: 'High-rise development waste management.',
    logo_url: '/logo.png',
    client_since: '2019-06-12'
  }
];

export const SAMPLE_SERVICES: Service[] = [];

export const SAMPLE_PROJECTS: Project[] = [
  {
    project_id: 'P_NEOM_01',
    project_name: 'The Line - Sector 1',
    company_id: 'C1',
    service_ids: ['S1', 'S1-1', 'S3'],
    location: 'NEOM, Tabuk',
    map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115456.91522067718!2d35.1585827!3d28.2325324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15ab993e506612d3%3A0x600108342416b0d9!2sNEOM!5e0!3m2!1sen!2ssa!4v1711123456789',
    po_number: 'PO-LINE-11',
    assets: { large_containers: 40, small_containers: 100, compactors: 5 },
    budget: 5000000,
    total_quantities: 12000,
    start_date: '2023-01-01',
    end_date: '2026-12-31'
  },
  {
    project_id: 'P_RSG_AMAALA',
    project_name: 'Amaala Triple Bay',
    company_id: 'C2',
    service_ids: ['S1', 'S4'],
    location: 'Red Sea Coast',
    map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115456.91522067718!2d37.15!3d24.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDMwJzAwLjAiTiAzN8KwMDknMDAuMCJF!5e0!3m2!1sen!2ssa!4v1711123456790',
    po_number: 'PO-AM-202',
    assets: { large_containers: 15, small_containers: 30, compactors: 2 },
    budget: 2500000,
    total_quantities: 6000,
    start_date: '2024-02-15',
    end_date: '2025-02-14'
  },
  {
    project_id: 'P_QID_SITE',
    project_name: 'Six Flags Site',
    company_id: 'C3',
    service_ids: ['S1', 'S2', 'S3'],
    location: 'Qiddiya, Riyadh',
    map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115456.91522067718!2d46.3!3d24.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDMwJzAwLjAiTiA0NiwxOCcwMC4wIkU!5e0!3m2!1sen!2ssa!4v1711123456791',
    po_number: 'PO-6F-90',
    assets: { large_containers: 20, small_containers: 40, compactors: 3 },
    budget: 1800000,
    total_quantities: 4500,
    start_date: '2024-05-01',
    end_date: '2025-05-01'
  },
  {
    project_id: 'P_AF_DXB',
    project_name: 'Infrastructure Upgrade B3',
    company_id: 'C4',
    service_ids: ['S1', 'S5', 'S6'],
    location: 'Jeddah South',
    map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3711.234!2d39.1!3d21.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDI0JzAwLjAiTiAzOcKwMDYnMDAuMCJF!5e0!3m2!1sen!2ssa!4v1711123456792',
    po_number: 'PO-AF-442',
    assets: { large_containers: 10, small_containers: 20, compactors: 1 },
    budget: 950000,
    total_quantities: 2200,
    start_date: '2023-10-01',
    end_date: '2024-12-31'
  }
];

export const SAMPLE_TRIPS: Trip[] = [
  // Past 30 Days (Sample spread for charts)
  { trip_id: 'T-100', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1', date: '2024-03-20', time: '08:00', quantity: '15.5', unit: 'TON', vehicle_id: 'V1', driver_id: 'D1', status: TripStatus.COMPLETED, notes: 'Morning load.', waste_manifest_no: 'M-1122', delivery_note_no: 'DN-8877' },
  { trip_id: 'T-101', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1', date: '2024-03-20', time: '10:30', quantity: '12.2', unit: 'TON', vehicle_id: 'V4', driver_id: 'D2', status: TripStatus.COMPLETED, notes: '', waste_manifest_no: 'M-1123' },
  { trip_id: 'T-102', company_id: 'C2', project_id: 'P_RSG_AMAALA', service_id: 'S4', date: '2024-03-20', time: '09:15', quantity: '8.0', unit: 'TON', vehicle_id: 'V3', driver_id: 'D4', status: TripStatus.COMPLETED, notes: 'Water supply.', delivery_note_no: 'DN-9900' },
  { trip_id: 'T-103', company_id: 'C3', project_id: 'P_QID_SITE', service_id: 'S2', date: '2024-03-19', time: '14:00', quantity: '5.5', unit: 'TON', vehicle_id: 'V1', driver_id: 'D1', status: TripStatus.COMPLETED, notes: 'Hazmat handling.', waste_manifest_no: 'M-4455' },
  { trip_id: 'T-104', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S3', date: '2024-03-19', time: '16:45', quantity: '10.0', unit: 'TON', vehicle_id: 'V6', driver_id: 'D5', status: TripStatus.COMPLETED, notes: 'Wood waste.', recycle_receipt_no: 'R-7766' },
  { trip_id: 'T-105', company_id: 'C2', project_id: 'P_RSG_AMAALA', service_id: 'S1', date: '2024-03-18', time: '07:30', quantity: '18.4', unit: 'TON', vehicle_id: 'V7', driver_id: 'D2', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-106', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1-1', date: '2024-03-18', time: '11:20', quantity: '14.1', unit: 'TON', vehicle_id: 'V1', driver_id: 'D4', status: TripStatus.COMPLETED, notes: 'Concrete load.' },
  { trip_id: 'T-107', company_id: 'C3', project_id: 'P_QID_SITE', service_id: 'S1', date: '2024-03-17', time: '09:00', quantity: '12.8', unit: 'TON', vehicle_id: 'V5', driver_id: 'D5', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-108', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1', date: '2024-03-17', time: '13:10', quantity: '16.0', unit: 'TON', vehicle_id: 'V1', driver_id: 'D1', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-109', company_id: 'C2', project_id: 'P_RSG_AMAALA', service_id: 'S4', date: '2024-03-16', time: '15:20', quantity: '7.5', unit: 'TON', vehicle_id: 'V3', driver_id: 'D4', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-110', company_id: 'C4', project_id: 'P_AF_DXB', service_id: 'S6', date: '2024-03-15', time: '10:00', quantity: '4.2', unit: 'TON', vehicle_id: 'V2', driver_id: 'D6', status: TripStatus.COMPLETED, notes: 'General waste' },
  { trip_id: 'T-111', company_id: 'C4', project_id: 'P_AF_DXB', service_id: 'S5', date: '2024-03-14', time: '11:00', quantity: '2.1', unit: 'TON', vehicle_id: 'V10', driver_id: 'D7', status: TripStatus.COMPLETED, notes: 'E-waste collected' },
  // Fix: Added missing 'notes' property to comply with Trip interface
  { trip_id: 'T-112', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1', date: '2024-03-13', time: '08:45', quantity: '19.5', unit: 'TON', vehicle_id: 'V1', driver_id: 'D1', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-113', company_id: 'C1', project_id: 'P_NEOM_01', service_id: 'S1', date: '2024-03-12', time: '09:00', quantity: '14.8', unit: 'TON', vehicle_id: 'V4', driver_id: 'D2', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-114', company_id: 'C2', project_id: 'P_RSG_AMAALA', service_id: 'S4', date: '2024-03-11', time: '13:30', quantity: '12.0', unit: 'TON', vehicle_id: 'V3', driver_id: 'D4', status: TripStatus.COMPLETED, notes: '' },
  { trip_id: 'T-115', company_id: 'C3', project_id: 'P_QID_SITE', service_id: 'S1', date: '2024-03-10', time: '07:15', quantity: '11.2', unit: 'TON', vehicle_id: 'V5', driver_id: 'D5', status: TripStatus.COMPLETED, notes: '' },
];

export const INITIAL_USER: User = {
  id: 'GUEST',
  name: 'GCM Guest',
  email: 'guest@gcm.local',
  password: '',
  role: Role.DEACTIVATED,
  avatar: '/logo.png',
};

export const SAMPLE_USERS: User[] = [
  INITIAL_USER,
  { id: 'U_DATA', name: 'Operations Team', email: 'ops@gcm.com', password: '123', role: Role.DATA_ENTRY, avatar: '/logo.png' },
  { id: 'U_FIN', name: 'Finance Auditor', email: 'finance@gcm.com', password: '123', role: Role.ACCOUNTANT, avatar: '/logo.png' },
  { id: 'U_LOG', name: 'Fleet Manager', email: 'fleet@gcm.com', password: '123', role: Role.LOGISTICS, avatar: '/logo.png' },
  { id: 'U_NEOM', name: 'Samer (NEOM Supervisor)', email: 'samer@neom.com', password: '123', role: Role.PROJECT_USER, company_id: 'C1', project_id: 'P_NEOM_01', avatar: '/logo.png' },
  { id: 'U_RSG', name: 'Sara (Red Sea Global)', email: 'sara@rsg.com', password: '123', role: Role.COMPANY_USER, company_id: 'C2', avatar: '/logo.png' },
  { id: 'U_DRV', name: 'Ahmed', email: 'driver@gcm.com', password: '123', role: Role.DRIVER, vehicle_id: 'V1', avatar: '/logo.png' }
];

export const INITIAL_LOGS: ActivityLog[] = [
  { id: 'L1', action: ActionType.CREATED, entity_type: EntityType.COMPANY, entity_id: 'C1', entity_name: 'NEOM Construction', details: 'System Initialization', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), user_id: 'U1' },
  { id: 'L2', action: ActionType.CREATED, entity_type: EntityType.PROJECT, entity_id: 'P_NEOM_01', entity_name: 'The Line', details: 'Project setup completed', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), user_id: 'U1' },
  { id: 'L3', action: ActionType.LOGIN, entity_type: EntityType.USER, entity_id: 'U_DATA', entity_name: 'Operations Team', details: 'Operations login', timestamp: new Date(Date.now() - 86400000).toISOString(), user_id: 'U_DATA' },
  { id: 'L4', action: ActionType.CREATED, entity_type: EntityType.TRIP, entity_id: 'T-100', entity_name: 'Field Trip', details: 'Registered weight 15.5T', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), user_id: 'U_DATA' },
  { id: 'L5', action: ActionType.UPDATED, entity_type: EntityType.LANDING, entity_id: 'L-1', entity_name: 'Home Page', details: 'Updated Hero Section Text', timestamp: new Date(Date.now() - 3600000).toISOString(), user_id: 'U1' },
];
