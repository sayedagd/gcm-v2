/**
 * GCM Bilingual Error System
 * [AR] نظام الأخطاء ثنائي اللغة — عربي + إنجليزي
 * كل رسالة خطأ بتطلع للمستخدم لازم تكون واضحة وسهلة الفهم
 */

// --- قاموس أسماء الكيانات ---
const ENTITY_NAMES = {
    companies: { ar: 'العميل', en: 'Company' },
    projects: { ar: 'المشروع', en: 'Project' },
    trips: { ar: 'الرحلة', en: 'Trip' },
    users: { ar: 'المستخدم', en: 'User' },
    services: { ar: 'الخدمة', en: 'Service' },
    vehicles: { ar: 'المركبة', en: 'Vehicle' },
    drivers: { ar: 'السائق', en: 'Driver' },
    suppliers: { ar: 'المورد', en: 'Supplier' },
    facilities: { ar: 'المنشأة', en: 'Facility' },
    containers: { ar: 'الحاوية', en: 'Container' },
    tanks: { ar: 'الخزان', en: 'Tank' },
    scales: { ar: 'الميزان', en: 'Scale' },
    inventory_sizes: { ar: 'حجم المخزون', en: 'Inventory Size' },
    notifications: { ar: 'الإشعار', en: 'Notification' },
    contact_submissions: { ar: 'رسالة التواصل', en: 'Contact Message' },
    permission_requests: { ar: 'طلب الصلاحية', en: 'Permission Request' },
    activity_logs: { ar: 'سجل النشاط', en: 'Activity Log' },
    project_services: { ar: 'خدمة المشروع', en: 'Project Service' },
};

// --- قاموس أسماء الحقول ---
const FIELD_NAMES = {
    company_name: { ar: 'اسم العميل', en: 'Company Name' },
    company_id: { ar: 'العميل', en: 'Company' },
    project_name: { ar: 'اسم المشروع', en: 'Project Name' },
    project_id: { ar: 'المشروع', en: 'Project' },
    service_name: { ar: 'اسم الخدمة', en: 'Service Name' },
    service_id: { ar: 'الخدمة', en: 'Service' },
    trip_id: { ar: 'رقم الرحلة', en: 'Trip ID' },
    name: { ar: 'الاسم', en: 'Name' },
    email: { ar: 'البريد الإلكتروني', en: 'Email' },
    password: { ar: 'كلمة المرور', en: 'Password' },
    role: { ar: 'الدور', en: 'Role' },
    plate_no: { ar: 'رقم اللوحة', en: 'Plate Number' },
    vehicle_type: { ar: 'نوع المركبة', en: 'Vehicle Type' },
    phone: { ar: 'رقم الجوال', en: 'Phone' },
    date: { ar: 'التاريخ', en: 'Date' },
    time: { ar: 'الوقت', en: 'Time' },
    quantity: { ar: 'الكمية', en: 'Quantity' },
    unit: { ar: 'الوحدة', en: 'Unit' },
    status: { ar: 'الحالة', en: 'Status' },
    code: { ar: 'الكود', en: 'Code' },
    type: { ar: 'النوع', en: 'Type' },
    category: { ar: 'الفئة', en: 'Category' },
    subject: { ar: 'الموضوع', en: 'Subject' },
    message: { ar: 'الرسالة', en: 'Message' },
    vehicle_id: { ar: 'المركبة', en: 'Vehicle' },
    driver_id: { ar: 'السائق', en: 'Driver' },
    facility_id: { ar: 'المنشأة', en: 'Facility' },
    supplier_id: { ar: 'المورد', en: 'Supplier' },
    size_id: { ar: 'الحجم', en: 'Size' },
    budget: { ar: 'الميزانية', en: 'Budget' },
    unit_price: { ar: 'سعر الوحدة', en: 'Unit Price' },
    total_cost: { ar: 'التكلفة الإجمالية', en: 'Total Cost' },
    contract_no: { ar: 'رقم العقد', en: 'Contract Number' },
    license_no: { ar: 'رقم الرخصة', en: 'License Number' },
    vat_no: { ar: 'الرقم الضريبي', en: 'VAT Number' },
    waste_manifest_no: { ar: 'رقم المانفيست', en: 'Manifest Number' },
    delivery_note_no: { ar: 'سند التسليم', en: 'Delivery Note Number' },
};

/**
 * [AR] ترجمة اسم الحقل
 * [EN] Translate field name
 */
const getFieldName = (field) => {
    return FIELD_NAMES[field] || { ar: field, en: field };
};

/**
 * [AR] ترجمة اسم الكيان
 * [EN] Translate entity name
 */
const getEntityName = (table) => {
    return ENTITY_NAMES[table] || { ar: table, en: table };
};

/**
 * [AR] إنشاء رسالة خطأ — حقل مطلوب
 */
const requiredField = (field) => {
    const f = getFieldName(field);
    return {
        code: 'REQUIRED',
        field,
        errorAr: `الحقل "${f.ar}" مطلوب`,
        errorEn: `"${f.en}" is required`,
    };
};

/**
 * [AR] إنشاء رسالة خطأ — كيان مكرر
 */
const duplicateEntity = (table, identifierValue) => {
    const e = getEntityName(table);
    return {
        code: 'DUPLICATE',
        errorAr: `${e.ar} "${identifierValue}" مسجل مسبقاً في النظام`,
        errorEn: `${e.en} "${identifierValue}" already exists in the system`,
    };
};

/**
 * [AR] إنشاء رسالة خطأ — كيان غير موجود (FK)
 */
const entityNotFound = (table) => {
    const e = getEntityName(table);
    return {
        code: 'NOT_FOUND',
        errorAr: `${e.ar} المختار غير موجود في النظام`,
        errorEn: `Selected ${e.en} does not exist`,
    };
};

/**
 * [AR] بيانات غير صالحة
 */
const invalidData = (field, reason) => {
    const f = getFieldName(field);
    const reasons = {
        email: { ar: 'صيغة البريد الإلكتروني غير صحيحة', en: 'Invalid email format' },
        date: { ar: 'التاريخ غير صحيح', en: 'Invalid date' },
        number: { ar: 'القيمة يجب أن تكون رقماً', en: 'Value must be a number' },
        positive: { ar: 'القيمة يجب أن تكون أكبر من صفر', en: 'Value must be greater than zero' },
        url: { ar: 'الرابط غير صحيح', en: 'Invalid URL' },
        empty: { ar: 'لا يمكن أن يكون فارغاً', en: 'Cannot be empty' },
    };
    const r = reasons[reason] || { ar: reason, en: reason };
    return {
        code: 'INVALID',
        field,
        errorAr: `${f.ar}: ${r.ar}`,
        errorEn: `${f.en}: ${r.en}`,
    };
};

/**
 * [AR] خطأ حذف — مرتبط ببيانات أخرى
 */
const deleteRestricted = (table, dependentTable) => {
    const e = getEntityName(table);
    const d = getEntityName(dependentTable);
    return {
        code: 'DELETE_RESTRICTED',
        errorAr: `لا يمكن حذف ${e.ar} لأنه مرتبط بـ${d.ar} في النظام`,
        errorEn: `Cannot delete ${e.en} because it is linked to ${d.en}`,
    };
};

/**
 * [AR] خطأ عام في الخادم
 */
const serverError = (detail = '') => {
    return {
        code: 'SERVER_ERROR',
        errorAr: `حدث خطأ في الخادم${detail ? ': ' + detail : ''}. يرجى المحاولة مرة أخرى.`,
        errorEn: `A server error occurred${detail ? ': ' + detail : ''}. Please try again.`,
    };
};

/**
 * [AR] ترجمة أخطاء PostgreSQL لرسائل بشرية ثنائية اللغة
 * @param {Error} pgError - الخطأ القادم من PostgreSQL
 * @param {string} table - اسم الجدول
 */
const translatePgError = (pgError, table) => {
    // e was assigned but never used

    // 23505 = unique_violation
    if (pgError.code === '23505') {
        const detail = pgError.detail || '';
        const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
        if (match) {
            const f = getFieldName(match[1]);
            return {
                code: 'DUPLICATE',
                field: match[1],
                errorAr: `${f.ar} "${match[2]}" موجود مسبقاً — لا يمكن التكرار`,
                errorEn: `${f.en} "${match[2]}" already exists — duplicates not allowed`,
            };
        }
        return duplicateEntity(table, '');
    }

    // 23503 = foreign_key_violation
    if (pgError.code === '23503') {
        const detail = pgError.detail || '';
        const match = detail.match(/table "(.+?)"/);
        if (match) {
            const dep = getEntityName(match[1]);
            return {
                code: 'FK_VIOLATION',
                errorAr: `لا يمكن إتمام العملية — ${dep.ar} المرتبط غير موجود أو محمي`,
                errorEn: `Cannot complete operation — linked ${dep.en} not found or protected`,
            };
        }
        return {
            code: 'FK_VIOLATION',
            errorAr: `لا يمكن إتمام العملية — بيانات مرتبطة مفقودة`,
            errorEn: `Cannot complete operation — linked data missing`,
        };
    }

    // 22P02 = invalid_text_representation
    if (pgError.code === '22P02') {
        return {
            code: 'INVALID_TYPE',
            errorAr: `نوع البيانات غير صحيح — يرجى التحقق من القيم المدخلة`,
            errorEn: `Invalid data type — please verify entered values`,
        };
    }

    // 22003 = numeric_value_out_of_range
    if (pgError.code === '22003') {
        return {
            code: 'OUT_OF_RANGE',
            errorAr: `القيمة المدخلة خارج النطاق المسموح`,
            errorEn: `Entered value is out of allowed range`,
        };
    }

    // 23502 = not_null_violation
    if (pgError.code === '23502') {
        const col = pgError.column || '';
        // f was assigned but never used
        return requiredField(col);
    }

    // Default — خطأ عام
    return serverError(pgError.message);
};

/**
 * [AR] ترجمة أخطاء Joi لرسائل بشرية ثنائية اللغة
 * @param {Object} joiError - الخطأ كامل من Joi (error.details array)
 */
const translateJoiErrors = (joiDetails) => {
    return joiDetails.map(detail => {
        const field = detail.path.join('.');
        const type = detail.type;

        if (type === 'any.required' || type === 'string.empty') {
            return requiredField(field);
        }
        if (type === 'string.email') {
            return invalidData(field, 'email');
        }
        if (type === 'date.base') {
            return invalidData(field, 'date');
        }
        if (type === 'number.base') {
            return invalidData(field, 'number');
        }
        if (type === 'number.positive' || type === 'number.min') {
            return invalidData(field, 'positive');
        }

        // Default — نرجع الخطأ مع ترجمة الحقل
        const f = getFieldName(field);
        return {
            code: 'VALIDATION',
            field,
            errorAr: `${f.ar}: بيانات غير صالحة`,
            errorEn: `${f.en}: invalid value`,
        };
    });
};

// --- قواعد كشف التكرار لكل جدول ---
const UNIQUE_RULES = {
    companies: { field: 'company_name', column: 'company_name', label: 'اسم العميل' },
    projects: { field: 'project_name', column: 'project_name', label: 'اسم المشروع', scope: 'company_id' },
    users: { field: 'email', column: 'email', label: 'البريد الإلكتروني' },
    services: { field: 'service_name', column: 'service_name', label: 'اسم الخدمة' },
    vehicles: { field: 'plate_no', column: 'plate_no', label: 'رقم اللوحة' },
    suppliers: { field: 'name', column: 'name', label: 'اسم المورد' },
    facilities: { field: 'name', column: 'name', label: 'اسم المنشأة' },
    containers: { field: 'code', column: 'code', label: 'كود الحاوية' },
    tanks: { field: 'code', column: 'code', label: 'كود الخزان' },
    scales: { field: 'code', column: 'code', label: 'كود الميزان' },
};

module.exports = {
    ENTITY_NAMES,
    FIELD_NAMES,
    UNIQUE_RULES,
    getFieldName,
    getEntityName,
    requiredField,
    duplicateEntity,
    entityNotFound,
    invalidData,
    deleteRestricted,
    serverError,
    translatePgError,
    translateJoiErrors,
};
