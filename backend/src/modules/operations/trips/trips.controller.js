/**
 * GCM Trips Controller (Micro-Module)
 */
const { query } = require('../../../../database');
const { list, upsert, remove } = require('../../../shared/controllers/crudController');

const genericUpsert = upsert('trips');

const ACTIVE_STATUSES = new Set([
    'ASSIGNED',
    'EN_ROUTE',
    'LOADING',
    'PENDING_APPROVAL',
    'IN_PROGRESS',
    'PENDING_DOCS',
    'PENDING_REVIEW',
    'COMPLETED'
]);

const parseAcceptedServices = (acceptedServices) => {
    if (!acceptedServices) return [];
    if (Array.isArray(acceptedServices)) return acceptedServices;
    if (typeof acceptedServices === 'string') {
        try {
            const parsed = JSON.parse(acceptedServices);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const validateTripBusinessRules = async (payload) => {
    const merged = { ...(payload || {}) };

    if (merged.trip_id) {
        const existing = await query('SELECT * FROM trips WHERE trip_id = $1', [merged.trip_id]);
        if (existing.rows[0]) {
            Object.assign(merged, existing.rows[0], payload);
        }
    }

    if (!merged.project_id) {
        return { status: 400, body: { errorAr: 'المشروع مطلوب', errorEn: 'Project is required', field: 'project_id', code: 'VALIDATION' } };
    }

    if (!merged.service_id) {
        return { status: 400, body: { errorAr: 'الخدمة مطلوبة', errorEn: 'Service is required', field: 'service_id', code: 'VALIDATION' } };
    }

    if (merged.quantity !== undefined && merged.quantity !== null && Number(merged.quantity) <= 0) {
        return { status: 400, body: { errorAr: 'الكمية يجب أن تكون أكبر من صفر', errorEn: 'Quantity must be greater than zero', field: 'quantity', code: 'VALIDATION' } };
    }

    const [projectResult, serviceResult] = await Promise.all([
        query('SELECT project_id, company_id FROM projects WHERE project_id = $1', [merged.project_id]),
        query('SELECT service_id, requires_recycle_receipt FROM services WHERE service_id = $1', [merged.service_id])
    ]);

    const project = projectResult.rows[0];
    const service = serviceResult.rows[0];

    if (!project) {
        return { status: 404, body: { errorAr: 'المشروع غير موجود', errorEn: 'Project not found', field: 'project_id', code: 'NOT_FOUND' } };
    }

    if (!service) {
        return { status: 404, body: { errorAr: 'الخدمة غير موجودة', errorEn: 'Service not found', field: 'service_id', code: 'NOT_FOUND' } };
    }

    const projectServiceCheck = await query(
        'SELECT 1 FROM project_services WHERE project_id = $1 AND service_id = $2 LIMIT 1',
        [merged.project_id, merged.service_id]
    );
    if (projectServiceCheck.rows.length === 0) {
        return { status: 409, body: { errorAr: 'الخدمة غير مرتبطة بالمشروع', errorEn: 'Service is not assigned to this project', field: 'service_id', code: 'CONFLICT' } };
    }

    if (merged.facility_id) {
        const facilityResult = await query('SELECT accepted_services FROM facilities WHERE facility_id = $1', [merged.facility_id]);
        const facility = facilityResult.rows[0];
        if (!facility) {
            return { status: 404, body: { errorAr: 'المرفق غير موجود', errorEn: 'Facility not found', field: 'facility_id', code: 'NOT_FOUND' } };
        }

        const acceptedServices = parseAcceptedServices(facility.accepted_services);
        if (acceptedServices.length > 0 && !acceptedServices.includes(merged.service_id)) {
            return { status: 409, body: { errorAr: 'المرفق لا يقبل هذه الخدمة', errorEn: 'Facility does not accept this service', field: 'facility_id', code: 'CONFLICT' } };
        }
    }

    if (ACTIVE_STATUSES.has(String(merged.status || '').toUpperCase())) {
        if (!merged.vehicle_id) {
            return { status: 400, body: { errorAr: 'المركبة مطلوبة للرحلات النشطة', errorEn: 'Vehicle is required for active trips', field: 'vehicle_id', code: 'VALIDATION' } };
        }
        if (!merged.driver_id) {
            return { status: 400, body: { errorAr: 'السائق مطلوب للرحلات النشطة', errorEn: 'Driver is required for active trips', field: 'driver_id', code: 'VALIDATION' } };
        }
    }

    if (service.requires_recycle_receipt) {
        if (!merged.recycle_receipt_no || !merged.recycle_file) {
            return { status: 400, body: { errorAr: 'إيصال التدوير مطلوب لهذه الخدمة', errorEn: 'Recycle receipt is required for this service', field: 'recycle_receipt_no', code: 'VALIDATION' } };
        }
    }

    return null;
};

const upsertTrip = async (req, res, next) => {
    try {
        const validationError = await validateTripBusinessRules(req.body);
        if (validationError) {
            return res.status(validationError.status).json(validationError.body);
        }
        return genericUpsert(req, res, next);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    list: list('trips'),
    upsert: upsertTrip,
    remove: remove('trips')
};
