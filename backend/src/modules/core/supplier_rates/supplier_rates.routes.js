/**
 * GCM Project Supplier Rates Routes (Micro-Module)
 */
const express = require('express');
const router = express.Router();
const { query } = require('../../../../database');
const { log } = require('../../../shared/utils/logger');
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

let supplierRatesTableReady = false;

const ensureSupplierRatesTable = async (_req, res, next) => {
	try {
		if (supplierRatesTableReady) {
			return next();
		}

		await query(`
			CREATE TABLE IF NOT EXISTS public.project_supplier_rates (
				id SERIAL PRIMARY KEY,
				project_id VARCHAR(255),
				supplier_id VARCHAR(255),
				service_id VARCHAR(255),
				cost_price NUMERIC,
				currency VARCHAR(255) DEFAULT 'SAR'
			)
		`);

		// Keep compatibility after partial restores where columns may drift.
		await query(`
			ALTER TABLE public.project_supplier_rates
				ADD COLUMN IF NOT EXISTS project_id VARCHAR(255),
				ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(255),
				ADD COLUMN IF NOT EXISTS service_id VARCHAR(255),
				ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
				ADD COLUMN IF NOT EXISTS currency VARCHAR(255) DEFAULT 'SAR'
		`);

		supplierRatesTableReady = true;
		return next();
	} catch (error) {
		log(`[SupplierRates] ensure table failed: ${error.message}`);
		return res.status(500).json({
			errorAr: 'تعذر تجهيز جدول أسعار الموردين',
			errorEn: 'Failed to initialize supplier rates table'
		});
	}
};

router.use(ensureSupplierRatesTable);

router.get('/', list('project_supplier_rates'));
router.post('/', upsert('project_supplier_rates'));
router.delete('/:id', remove('project_supplier_rates'));

module.exports = router;
