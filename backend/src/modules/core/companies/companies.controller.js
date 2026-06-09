/**
 * GCM Companies Controller (Micro-Module)
 */
const { asc, ne, or, sql } = require('drizzle-orm');
const { db } = require('../../../shared/db/drizzle/client');
const { companies } = require('../../../shared/db/drizzle/schema');
const { upsert, deleteCompany } = require('../../../shared/controllers/crudController');
const { log, logEvent } = require('../../../shared/utils/logger');
const { serverError } = require('../../../shared/utils/bilingualErrors');

const toApiCompany = (row) => ({
    company_id: row.companyId,
    company_name: row.companyName,
    commercial_reg: row.commercialReg,
    contract_no: row.contractNo,
    details: row.details,
    logo_url: row.logoUrl,
    client_since: row.clientSince,
    vat_no: row.vatNo,
    cr_file: row.crFile,
    vat_file: row.vatFile,
    national_address_file: row.nationalAddressFile,
    main_location_url: row.mainLocationUrl,
    billing_address: row.billingAddress,
    contact_name: row.contactName,
    contact_phone: row.contactPhone,
    contact_email: row.contactEmail,
    website_url: row.websiteUrl,
    user_id: row.userId,
});

const list = async (req, res) => {
    const startedAt = Date.now();
    try {
        const rows = await db
            .select()
            .from(companies)
            .where(or(ne(companies.details, 'ARCHIVED'), sql`${companies.details} IS NULL`))
            .orderBy(asc(companies.companyId));

        logEvent('companies_list_query', {
            source: 'drizzle',
            durationMs: Date.now() - startedAt,
            rowCount: rows.length,
        });

        return res.json(rows.map(toApiCompany));
    } catch (error) {
        log(`[Companies/List Error] ${error.message}`);
        return res.status(500).json(serverError());
    }
};

module.exports = {
    list,
    upsert: upsert('companies'),
    remove: deleteCompany
};
