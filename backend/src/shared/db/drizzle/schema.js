const {
    pgTable,
    varchar,
    timestamp,
    text,
    date,
    numeric,
    integer,
} = require('drizzle-orm/pg-core');

const users = pgTable('users', {
    id: varchar('id', { length: 100 }).primaryKey(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    password: text('password').notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    avatar: text('avatar'),
    companyId: varchar('company_id', { length: 100 }),
    projectId: varchar('project_id', { length: 100 }),
    supplierId: varchar('supplier_id', { length: 100 }),
    createdAt: timestamp('created_at'),
    lastLogin: timestamp('last_login'),
    status: varchar('status', { length: 50 }),
    preferences: text('preferences'),
});

const companies = pgTable('companies', {
    companyId: varchar('company_id', { length: 100 }).primaryKey(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    commercialReg: varchar('commercial_reg', { length: 100 }),
    contractNo: varchar('contract_no', { length: 100 }),
    details: text('details'),
    logoUrl: text('logo_url'),
    clientSince: date('client_since'),
    vatNo: varchar('vat_no', { length: 100 }),
    crFile: text('cr_file'),
    vatFile: text('vat_file'),
    nationalAddressFile: text('national_address_file'),
    mainLocationUrl: text('main_location_url'),
    billingAddress: text('billing_address'),
    contactName: varchar('contact_name', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    websiteUrl: text('website_url'),
    userId: varchar('user_id', { length: 100 }),
});

const projects = pgTable('projects', {
    projectId: varchar('project_id', { length: 100 }).primaryKey(),
    projectName: varchar('project_name', { length: 255 }).notNull(),
    companyId: varchar('company_id', { length: 100 }),
    location: text('location'),
    mapUrl: text('map_url'),
    poNumber: varchar('po_number', { length: 100 }),
    poFile: text('po_file'),
    details: text('details'),
    logoUrl: text('logo_url'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    budget: numeric('budget', { precision: 15, scale: 2 }),
    totalQuantities: numeric('total_quantities', { precision: 15, scale: 2 }),
    assetsLargeContainers: integer('assets_large_containers'),
    assetsSmallContainers: integer('assets_small_containers'),
    assetsCompactors: integer('assets_compactors'),
    assetsOther: integer('assets_other'),
    status: varchar('status', { length: 50 }),
    userId: varchar('user_id', { length: 100 }),
});

module.exports = {
    users,
    companies,
    projects,
};
