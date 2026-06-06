/**
 * GCM Validators — Full Coverage for ALL Tables
 * [AR] نظام التحقق الشامل — تغطية كاملة لكل الجداول مع رسائل ثنائية اللغة
 */
const Joi = require('joi');

// --- قواعد مشتركة ---
const str = (maxLen = 500) => Joi.alternatives().try(Joi.string().max(maxLen).trim(), Joi.number());
const optStr = (maxLen = 500) => str(maxLen).optional().allow('', null);
const reqStr = (maxLen = 500) => str(maxLen).required();
const optDate = () => Joi.alternatives().try(Joi.date(), Joi.string().allow('', null)).optional();
// [AR] قبول الأرقام كنص أو رقم — عشان الفرونت أحياناً يبعتها string
const flexNum = () => Joi.alternatives().try(Joi.number(), Joi.string().pattern(/^-?\d+\.?\d*$/).allow('', null)).optional();
const optNum = () => flexNum();
const optBool = () => Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional();
const optFile = () => Joi.string().optional().allow('', null); // base64 or URL

const schemas = {

    // ═══════════════════════════════════════════
    // [AR] الرحلات — أهم جدول في النظام
    // ═══════════════════════════════════════════
    trips: Joi.object({
        trip_id: optStr(),
        project_id: optStr().messages({
            'any.required': 'المشروع مطلوب | Project is required',
            'string.empty': 'المشروع مطلوب | Project is required',
        }),
        service_id: optStr(),
        date: Joi.date().optional().allow("", null).messages({
            'any.required': 'التاريخ مطلوب | Date is required',
            'date.base': 'التاريخ غير صحيح | Invalid date format',
        }),
        time: optStr(),
        quantity: Joi.alternatives().try(
            Joi.number().min(0),
            Joi.string().pattern(/^\d+\.?\d*$/).allow('0', '')
        ).optional().allow('', null, '0', 0),
        unit: optStr(50),
        vehicle_id: optStr(),
        driver_id: optStr(),
        status: Joi.string().valid(
            'REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'LOADING',
            'PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS',
            'PENDING_DOCS', 'COMPLETED', 'CANCELLED', 'PENDING_REVIEW'
        ).default('REQUESTED').messages({
            'any.only': 'حالة الرحلة غير صالحة | Invalid trip status',
        }),
        notes: optStr(2000),
        waste_manifest_no: optStr(),
        delivery_note_no: optStr(),
        recycle_receipt_no: optStr(),
        manifest_file: optFile(),
        delivery_note_file: optFile(),
        recycle_file: optFile(),
        proof_images: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional().allow(null),
        trip_location_url: optStr(2000),
        supervisor_name: optStr(),
        gcm_supervisor_name: optStr(),
        facility_id: optStr(),
        receipt_no: optStr(),
        is_manifest_generated: optBool(),
        is_delivery_note_generated: optBool(),
        assigned_at: optStr(),
        driver_accepted_at: optStr(),
        priority: optStr(50),
        container_image_before: optFile(),
        container_image_after: optFile(),
        client_approved: optBool(),
        client_approved_at: optStr(),
        request_location_url: optStr(2000),
        request_container_image: optStr(1000000), // base64
        preferred_time: optStr(50),
        issue_notes: optStr(2000),
        company_id: optStr(),
        container_size: optStr(50),
        hub_link: optStr(1000),
        supervisor_signature: optStr(1000000), // base64 image possible
        user_id: optStr(),
        source: optStr(50),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] العملاء (الشركات)
    // ═══════════════════════════════════════════
    companies: Joi.object({
        company_id: optStr(),
        company_name: optStr(255).messages({
            'any.required': 'اسم العميل مطلوب | Company name is required',
            'string.empty': 'اسم العميل مطلوب | Company name is required',
        }),
        commercial_reg: optStr(100),
        contract_no: optStr(100),
        details: optStr(2000),
        logo_url: optFile(),
        client_since: optStr(),
        vat_no: optStr(50),
        cr_file: optFile(),
        main_location_url: optStr(2000),
        billing_address: optStr(500),
        contact_name: optStr(255),
        contact_phone: optStr(50),
        contact_email: Joi.string().email({ tlds: false }).optional().allow('', null).messages({
            'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
        }),
        website_url: optStr(500),
        vat_file: optFile(),
        national_address_file: optFile(),
        user_id: optStr(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] المشاريع (المواقع)
    // ═══════════════════════════════════════════
    projects: Joi.object({
        project_id: optStr(),
        project_name: optStr(255).messages({
            'any.required': 'اسم المشروع مطلوب | Project name is required',
            'string.empty': 'اسم المشروع مطلوب | Project name is required',
        }),
        company_id: optStr().messages({
            'any.required': 'العميل مطلوب | Company is required',
            'string.empty': 'العميل مطلوب | Company is required',
        }),
        location: optStr(500),
        map_url: optStr(2000),
        po_number: optStr(100),
        po_file: optFile(),
        details: optStr(2000),
        logo_url: optFile(),
        start_date: optDate(),
        end_date: optDate(),
        budget: optNum(),
        total_quantities: optStr(),
        assets_large_containers: optNum(),
        assets_small_containers: optNum(),
        assets_compactors: optNum(),
        assets_other: optNum(),
        status: optStr(50),
        user_id: optStr(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] المستخدمون
    // ═══════════════════════════════════════════
    users: Joi.object({
        id: optStr().messages({
            'any.required': 'معرف المستخدم مطلوب | User ID is required',
        }),
        name: optStr(255).messages({
            'any.required': 'اسم المستخدم مطلوب | User name is required',
            'string.empty': 'اسم المستخدم مطلوب | User name is required',
        }),
        email: Joi.string().email({ tlds: false }).optional().allow("", null).messages({
            'any.required': 'البريد الإلكتروني مطلوب | Email is required',
            'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
            'string.empty': 'البريد الإلكتروني مطلوب | Email is required',
        }),
        password: optStr(),
        role: optStr(50).messages({
            'any.required': 'الدور مطلوب | Role is required',
            'string.empty': 'الدور مطلوب | Role is required',
        }),
        avatar: optFile(),
        company_id: optStr(),
        project_id: optStr(),
        supplier_id: optStr(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] الخدمات
    // ═══════════════════════════════════════════
    services: Joi.object({
        service_id: optStr(),
        service_name: optStr(255).messages({
            'any.required': 'اسم الخدمة مطلوب | Service name is required',
            'string.empty': 'اسم الخدمة مطلوب | Service name is required',
        }),
        service_description: optStr(2000),
        parent_id: optStr(),
        major_category: optStr(50),
        requires_recycle_receipt: optBool(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] المركبات
    // ═══════════════════════════════════════════
    vehicles: Joi.object({
        vehicle_id: optStr(),
        plate_no: optStr(50).messages({
            'any.required': 'رقم اللوحة مطلوب | Plate number is required',
            'string.empty': 'رقم اللوحة مطلوب | Plate number is required',
        }),
        vehicle_type: optStr(100).messages({
            'any.required': 'نوع المركبة مطلوب | Vehicle type is required',
            'string.empty': 'نوع المركبة مطلوب | Vehicle type is required',
        }),
        status: optStr(50),
        ownership_type: optStr(50),
        supplier_id: optStr(),
        permit_count: optNum(),
        permit_zones: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
        is_small_vehicle: optBool(),
        documents: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
        photo_front: optFile(),
        photo_back: optFile(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] السائقون
    // ═══════════════════════════════════════════
    drivers: Joi.object({
        driver_id: optStr(),
        name: optStr(255),
        phone: optStr(50),
        license_no: optStr(100),
        status: optStr(50),
        license_file: optFile(),
        license_expiry: optDate(),
        iqama_file: optFile(),
        iqama_no: optStr(100),
        iqama_expiry: optDate(),
        operating_card_no: optStr(100),
        operating_card_expiry: optDate(),
        operating_card_file: optFile(),
        insurance_no: optStr(100),
        insurance_expiry: optDate(),
        insurance_file: optFile(),
        category: optStr(50),
        ownership_type: optStr(50),
        supplier_id: optStr(),
        role_title: optStr(100),
        vehicle_id: optStr(),
        user_id: optStr(),
        permit_count: optNum(),
        permit_zones: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] الموردون
    // ═══════════════════════════════════════════
    suppliers: Joi.object({
        supplier_id: optStr(),
        name: optStr(255).messages({
            'any.required': 'اسم المورد مطلوب | Supplier name is required',
            'string.empty': 'اسم المورد مطلوب | Supplier name is required',
        }),
        category: optStr(100),
        license_no: optStr(100),
        vat_no: optStr(50),
        bank_name: optStr(255),
        iban: optStr(50),
        address: optStr(500),
        contact_person: optStr(255),
        phone: optStr(50),
        email: Joi.string().email({ tlds: false }).optional().allow('', null).messages({
            'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
        }),
        website: optStr(500),
        logo_url: optFile(),
        license_file: optFile(),
        vat_file: optFile(),
        agreement_file: optFile(),
        status: optStr(50),
        user_id: optStr(),
        payment_terms: optStr(255),
        contract_start: optDate(),
        contract_end: optDate(),
        work_start_date: optDate(),
        assigned_projects: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
        assigned_services: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
        created_at: optStr(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] المنشآت
    // ═══════════════════════════════════════════
    facilities: Joi.object({
        facility_id: optStr(),
        name: optStr(255).messages({
            'any.required': 'اسم المنشأة مطلوب | Facility name is required',
            'string.empty': 'اسم المنشأة مطلوب | Facility name is required',
        }),
        type: optStr(100),
        contract_no: optStr(100),
        contract_file: optFile(),
        contract_start: optDate(),
        contract_end: optDate(),
        accepted_services: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
        location_url: optStr(2000),
        status: optStr(50),
        details: optStr(2000),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] الحاويات + الخزانات + الموازين (نفس الهيكل)
    // ═══════════════════════════════════════════
    containers: Joi.object({
        container_id: optStr(),
        code: optStr(100).messages({
            'any.required': 'كود الحاوية مطلوب | Container code is required',
            'string.empty': 'كود الحاوية مطلوب | Container code is required',
        }),
        name: optStr(255),
        status: optStr(50),
        ownership: optStr(50),
        size_id: optStr(),
        project_id: optStr(),
        supplier_id: optStr(),
        doc_file: optFile(),
        purchase_date: optDate(),
        maintenance_logs: Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object()).optional().allow(null),
    }).unknown(true),

    tanks: Joi.object({
        tank_id: optStr(),
        code: optStr(100).messages({
            'any.required': 'كود الخزان مطلوب | Tank code is required',
            'string.empty': 'كود الخزان مطلوب | Tank code is required',
        }),
        name: optStr(255),
        status: optStr(50),
        ownership: optStr(50),
        size_id: optStr(),
        project_id: optStr(),
        supplier_id: optStr(),
        doc_file: optFile(),
        purchase_date: optDate(),
        maintenance_logs: Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object()).optional().allow(null),
    }).unknown(true),

    scales: Joi.object({
        scale_id: optStr(),
        code: optStr(100).messages({
            'any.required': 'كود الميزان مطلوب | Scale code is required',
            'string.empty': 'كود الميزان مطلوب | Scale code is required',
        }),
        name: optStr(255),
        status: optStr(50),
        ownership: optStr(50),
        size_id: optStr(),
        project_id: optStr(),
        supplier_id: optStr(),
        doc_file: optFile(),
        purchase_date: optDate(),
        maintenance_logs: Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object()).optional().allow(null),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] أحجام المخزون
    // ═══════════════════════════════════════════
    inventory_sizes: Joi.object({
        size_id: optStr(),
        name: optStr(255).messages({
            'any.required': 'اسم الحجم مطلوب | Size name is required',
            'string.empty': 'اسم الحجم مطلوب | Size name is required',
        }),
        type: optStr(100),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] خدمات المشاريع
    // ═══════════════════════════════════════════
    project_services: Joi.object({
        id: optStr(), // VARCHAR after migration from SERIAL
        project_id: optStr(),
        service_id: optStr(),
        quantity: optNum(),
        unit_price: optNum(),
        total_cost: optNum(),
        progress_level: optNum(),
        supplier_id: optStr(),
        cost_price: optNum(),
        warning_threshold: optNum(),
        notes: optStr(2000),
    }).unknown(false),

    // ═══════════════════════════════════════════
    // [AR] رسائل التواصل
    // ═══════════════════════════════════════════
    contact_submissions: Joi.object({
        id: Joi.any().optional().allow('', null),
        name: reqStr(255).messages({
            'any.required': 'الاسم مطلوب | Name is required',
            'string.empty': 'الاسم مطلوب | Name is required',
        }),
        email: Joi.string().email({ tlds: false }).required().messages({
            'any.required': 'البريد الإلكتروني مطلوب | Email is required',
            'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
            'string.empty': 'البريد الإلكتروني مطلوب | Email is required',
        }),
        phone: optStr(100),
        company: optStr(255),
        subject: optStr(500),
        message: reqStr(5000).messages({
            'any.required': 'الرسالة مطلوبة | Message is required',
            'string.empty': 'الرسالة مطلوبة | Message is required',
        }),
        created_at: optStr(),
    }).unknown(false),

    // ═══════════════════════════════════════════
    // [AR] طلبات الصلاحيات
    // ═══════════════════════════════════════════
    permission_requests: Joi.object({
        id: optStr(),
        email: Joi.string().email({ tlds: false }).required().messages({
            'any.required': 'البريد الإلكتروني مطلوب | Email is required',
            'string.email': 'البريد الإلكتروني غير صحيح | Invalid email format',
            'string.empty': 'البريد الإلكتروني مطلوب | Email is required',
        }),
        from_location: optStr(500),
        notes: optStr(2000),
        status: optStr(50),
        timestamp: optStr(),
    }).unknown(false),

    // ═══════════════════════════════════════════
    // [AR] سجلات النشاط
    // ═══════════════════════════════════════════
    activity_logs: Joi.object({
        id: optStr(),
        action: optStr(100),
        entity_type: optStr(100),
        entity_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow('', null),
        entity_name: optStr(500),
        details: optStr(2000),
        timestamp: optStr(),
        user_id: optStr(),
    }).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] إعدادات النظام — بدون validation صارم
    // ═══════════════════════════════════════════
    saas_config: Joi.object({}).unknown(true),

    // ═══════════════════════════════════════════
    // [AR] متجر الأجهزة البيئية
    // ═══════════════════════════════════════════
    environmental_equipments: Joi.object({
        equipment_id: optStr(),
        name_ar: optStr(255),
        name_en: optStr(255),
        description_ar: optStr(5000),
        description_en: optStr(5000),
        image_url: optStr(2000),
        catalog_url: optStr(2000),
        data_sheet_url: optStr(2000),
        specifications: optStr(10000),
        status: optStr(50),
        share_count: optNum(),
        additional_images: Joi.alternatives().try(Joi.string(), Joi.array()).optional().allow(null),
    }).unknown(true),

    equipment_inquiries: Joi.object({
        id: optNum(), // SERIAL
        equipment_id: reqStr(), // FK
        customer_name: reqStr(255),
        email: Joi.string().email({ tlds: false }).optional().allow('', null),
        phone: optStr(100),
        company: optStr(255),
        message: reqStr(5000),
        status: optStr(50),
        admin_reply: optStr(5000),
        product_name_snapshot: optStr(255),
    }).unknown(false),
};

module.exports = schemas;
