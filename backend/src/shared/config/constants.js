/**
 * GCM Backend Constants
 * [SCHEMA], [PK_MAP], [DEFAULT_SaaS_CONFIG]
 */

const SCHEMA = {
    companies: ['company_id', 'company_name', 'commercial_reg', 'contract_no', 'details', 'logo_url', 'client_since', 'vat_no', 'cr_file', 'main_location_url', 'billing_address', 'contact_name', 'contact_phone', 'contact_email', 'website_url', 'vat_file', 'national_address_file', 'user_id'],
    projects: ['project_id', 'project_name', 'company_id', 'location', 'map_url', 'po_number', 'po_file', 'details', 'logo_url', 'start_date', 'end_date', 'budget', 'total_quantities', 'assets_large_containers', 'assets_small_containers', 'assets_compactors', 'assets_other', 'status', 'user_id'],
    project_services: ['id', 'project_id', 'service_id', 'quantity', 'unit_price', 'total_cost', 'progress_level', 'supplier_id', 'cost_price', 'warning_threshold', 'notes'],
    services: ['service_id', 'service_name', 'service_description', 'parent_id', 'requires_recycle_receipt', 'major_category'],
    vehicles: ['vehicle_id', 'plate_no', 'vehicle_type', 'status', 'ownership_type', 'supplier_id', 'permit_count', 'permit_zones', 'is_small_vehicle', 'documents', 'photo_front', 'photo_back'],
    drivers: ['driver_id', 'name', 'phone', 'license_no', 'status', 'license_file', 'iqama_file', 'user_id', 'license_expiry', 'iqama_no', 'iqama_expiry', 'operating_card_no', 'operating_card_expiry', 'operating_card_file', 'insurance_no', 'insurance_expiry', 'insurance_file', 'category', 'ownership_type', 'supplier_id', 'role_title', 'vehicle_id', 'permit_count', 'permit_zones'],
    trips: ['trip_id', 'project_id', 'service_id', 'date', 'time', 'quantity', 'unit', 'vehicle_id', 'driver_id', 'status', 'notes', 'waste_manifest_no', 'delivery_note_no', 'recycle_receipt_no', 'manifest_file', 'delivery_note_file', 'recycle_file', 'proof_images', 'trip_location_url', 'supervisor_name', 'gcm_supervisor_name', 'facility_id', 'receipt_no', 'is_manifest_generated', 'is_delivery_note_generated', 'inventory_item_id', 'assigned_at', 'driver_accepted_at', 'priority', 'container_image_before', 'container_image_after', 'client_approved', 'client_approved_at', 'request_location_url', 'request_container_image', 'preferred_time', 'issue_notes', 'company_id', 'container_size', 'hub_link', 'supervisor_signature', 'source', 'client_signature', 'client_stamp', 'gcm_signature', 'gcm_stamp'],
    users: ['id', 'name', 'email', 'password', 'role', 'avatar', 'company_id', 'project_id', 'supplier_id', 'signature', 'stamp'],
    notifications: ['id', 'title', 'message', 'type', 'timestamp', 'read', 'link', 'user_id'],
    permission_requests: ['id', 'email', 'from_location', 'notes', 'status', 'timestamp'],
    activity_logs: ['id', 'action', 'entity_type', 'entity_id', 'entity_name', 'details', 'timestamp', 'user_id'],
    inventory_sizes: ['size_id', 'name', 'type'],
    containers: ['container_id', 'code', 'name', 'status', 'ownership', 'size_id', 'project_id', 'supplier_id', 'doc_file', 'purchase_date', 'maintenance_logs'],
    tanks: ['tank_id', 'code', 'name', 'status', 'ownership', 'size_id', 'project_id', 'supplier_id', 'doc_file', 'purchase_date', 'maintenance_logs'],
    scales: ['scale_id', 'code', 'name', 'status', 'ownership', 'size_id', 'project_id', 'supplier_id', 'doc_file', 'purchase_date', 'maintenance_logs'],
    suppliers: ['supplier_id', 'name', 'category', 'license_no', 'vat_no', 'bank_name', 'iban', 'address', 'contact_persons', 'phone', 'email', 'website', 'logo_url', 'license_file', 'vat_file', 'agreement_file', 'status', 'user_id', 'created_at', 'payment_terms', 'contract_start', 'contract_end', 'work_start_date', 'assigned_projects', 'assigned_services'],
    contact_submissions: ['id', 'name', 'email', 'phone', 'company', 'subject', 'message', 'created_at'],
    saas_config: ['id', 'app_name_ar', 'app_name_en', 'app_slogan_ar', 'app_slogan_en', 'primary_color', 'logo_url', 'logo_dark_url', 'language', 'landing_page', 'store_page', 'template_config', 'ai_assistant', 'management_controls_enabled', 'boot_config', 'support_phone', 'support_whatsapp'],
    project_supplier_rates: ['id', 'project_id', 'supplier_id', 'service_id', 'cost_price', 'currency'],
    ai_sessions: ['id', 'user_id', 'user_name', 'user_role', 'action_type', 'language', 'status', 'started_at', 'ended_at', 'duration_seconds', 'trip_reference', 'error_message', 'trip_data_summary', 'rating', 'ai_confidence_score', 'flagged', 'ip_address'],
    ai_messages: ['id', 'session_id', 'sender', 'message', 'timestamp'],
    facilities: ['facility_id', 'name', 'type', 'contract_no', 'contract_file', 'contract_start', 'contract_end', 'accepted_services', 'location_url', 'status', 'details'],
    environmental_equipments: ['equipment_id', 'name_ar', 'name_en', 'description_ar', 'description_en', 'image_url', 'additional_images', 'status', 'catalog_url', 'data_sheet_url', 'specifications', 'share_count', 'created_at'],
    equipment_inquiries: ['id', 'customer_name', 'email', 'phone', 'company', 'message', 'equipment_id', 'admin_reply', 'status', 'created_at'],
    asset_requests: ['id', 'supplier_id', 'type', 'data', 'status', 'notes', 'created_at', 'updated_at'],
    asset_service_links: ['id', 'asset_type', 'asset_id', 'service_id', 'created_at']
};

const PK_MAP = {
    companies: 'company_id', projects: 'project_id', services: 'service_id', vehicles: 'vehicle_id',
    drivers: 'driver_id', users: 'id', trips: 'trip_id', notifications: 'id',
    permission_requests: 'id', activity_logs: 'id', contact_submissions: 'id', project_services: 'id',
    inventory_sizes: 'size_id', containers: 'container_id', tanks: 'tank_id', scales: 'scale_id', suppliers: 'supplier_id', saas_config: 'id',
    project_supplier_rates: 'id', ai_sessions: 'id', ai_messages: 'id', facilities: 'facility_id',
    environmental_equipments: 'equipment_id', equipment_inquiries: 'id', asset_requests: 'id',
    asset_service_links: 'id'
};

const DEFAULT_SaaS_CONFIG = {
    app_name_ar: 'GCM للخدمات البيئية',
    app_name_en: 'GCM Eco Services',
    app_slogan_ar: 'نحو مستقبل بيئي مستدام',
    app_slogan_en: 'Towards a sustainable environmental future',
    primary_color: '#10b981',
    logo_url: '/logo-light.png',
    logo_dark_url: '/logo-dark.png',
    language: 'ar',
    landing_page: {
        heroTitleAr: 'حلول بيئية مستدامة للمستقبل',
        heroTitleEn: 'Sustainable Environmental Solutions for the Future',
        heroDescAr: 'شركة الرسالة الواضحة العالمية — شريككم المعتمد في إدارة النفايات والخدمات البيئية المتكاملة بالمملكة العربية السعودية',
        heroDescEn: 'Global Clear Mission — Your certified partner in waste management and integrated environmental services across Saudi Arabia',
        heroBgUrl: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&q=80',
        heroStats: [
            { valueAr: '+15', valueEn: '15+', labelAr: 'سنة خبرة', labelEn: 'Years Experience' },
            { valueAr: '+500', valueEn: '500+', labelAr: 'مشروع منجز', labelEn: 'Projects Completed' },
            { valueAr: '+50', valueEn: '50+', labelAr: 'عميل نشط', labelEn: 'Active Clients' },
            { valueAr: '24/7', valueEn: '24/7', labelAr: 'دعم فني', labelEn: 'Technical Support' }
        ],
        trustBadges: [
            { labelAr: 'معتمدة من موان', labelEn: 'Mowan Certified' },
            { labelAr: 'متوافقة مع NCEC', labelEn: 'NCEC Compliant' },
            { labelAr: 'رؤية 2030', labelEn: 'Vision 2030' }
        ],
        aboutTitleAr: 'من نحن',
        aboutTitleEn: 'About Us',
        aboutDescAr: 'شركة الرسالة الواضحة العالمية (GCM)',
        aboutDescEn: 'Global Clear Mission (GCM)',
        aboutTextAr: 'تأسست شركة الرسالة الواضحة العالمية في المملكة العربية السعودية كشركة رائدة متخصصة في تقديم الحلول البيئية المتكاملة والخدمات اللوجستية.',
        aboutTextEn: 'Global Clear Mission (GCM) was established in Saudi Arabia as a leading company specializing in integrated environmental solutions and logistical services.',
        aboutImageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80',
        experienceYears: 15,
        projectsCount: '500+',
        clientsCount: '50+',
        vehiclesCount: '120+',
        complianceTextAr: 'نظام متوافق بالكامل مع معايير NCEC',
        complianceTextEn: 'Fully NCEC compliant system',
        servicesSectionTitleAr: 'خدماتنا البيئية المتخصصة',
        servicesSectionTitleEn: 'Our Specialized Environmental Services',
        servicesSectionDescAr: 'حلول بيئية شاملة مصممة لتلبية احتياجات المشاريع الكبرى في المملكة',
        servicesSectionDescEn: 'Comprehensive environmental solutions designed for major projects across the Kingdom',
        defaultServices: [
            { id: 'svc-1', iconType: 'recycle', titleAr: 'إدارة النفايات الصناعية', titleEn: 'Industrial Waste Management', descAr: 'نقل ومعالجة وتدوير النفايات الصناعية والخطرة وفق اشتراطات NCEC.', descEn: 'Transport, treatment, and recycling of industrial and hazardous waste per NCEC regulations.' },
            { id: 'svc-2', iconType: 'truck', titleAr: 'نقل النفايات الإنشائية', titleEn: 'Construction Waste Hauling', descAr: 'أسطول متخصص لنقل مخلفات البناء والهدم مع تتبع GPS لحظي.', descEn: 'Specialized fleet for transporting C&D waste with real-time GPS tracking.' },
            { id: 'svc-3', iconType: 'droplet', titleAr: 'إدارة النفايات السائلة', titleEn: 'Liquid Waste Management', descAr: 'شفط ونقل ومعالجة المياه العادمة والنفايات السائلة.', descEn: 'Suction, transport, and treatment of wastewater and liquid waste.' },
            { id: 'svc-4', iconType: 'shield', titleAr: 'الاستشارات البيئية', titleEn: 'Environmental Consulting', descAr: 'دراسات تقييم الأثر البيئي وخطط إدارة النفايات.', descEn: 'EIA studies and waste management plans.' },
            { id: 'svc-5', iconType: 'factory', titleAr: 'توريد الحاويات والمعدات', titleEn: 'Container & Equipment Supply', descAr: 'توريد وتأجير حاويات بمختلف الأحجام (2-40 ياردة).', descEn: 'Supply and rental of containers in various sizes (2-40 yards).' },
            { id: 'svc-6', iconType: 'settings', titleAr: 'أنظمة المراقبة البيئية', titleEn: 'Environmental Monitoring Systems', descAr: 'أنظمة رصد الانبعاثات وجودة الهواء والمياه.', descEn: 'Emissions and air/water quality monitoring systems.' }
        ],
        services: [],
        certifications: [
            { id: 'cert-1', nameAr: 'الهيئة العامة للنقل (موان)', nameEn: 'General Authority of Transport (Mowan)', descAr: 'ترخيص نقل النفايات والمواد الخطرة', descEn: 'Licensed for waste and hazardous materials transport', icon: 'truck' },
            { id: 'cert-2', nameAr: 'المركز الوطني للرقابة البيئية (NCEC)', nameEn: 'National Center for Environmental Compliance (NCEC)', descAr: 'اعتماد الالتزام البيئي الشامل', descEn: 'Full environmental compliance certification', icon: 'shield' },
            { id: 'cert-3', nameAr: 'رؤية المملكة 2030', nameEn: 'Saudi Vision 2030', descAr: 'مساهمة فعالة في أهداف الاستدامة', descEn: 'Active contribution to sustainability goals', icon: 'globe' }
        ],
        whyChooseUs: [
            { titleAr: 'الالتزام البيئي الكامل', titleEn: 'Full Environmental Compliance', descAr: 'جميع عملياتنا مرخصة ومعتمدة من NCEC وموان.', descEn: 'All operations licensed and certified by NCEC and Mowan.' },
            { titleAr: 'نظام تتبع ذكي GCM-ERP', titleEn: 'GCM-ERP Smart Tracking System', descAr: 'لوحة تحكم ذكية لمتابعة لحظية لكل رحلة.', descEn: 'Smart dashboard for real-time tracking of every trip.' },
            { titleAr: 'دعم فني متخصص 24/7', titleEn: '24/7 Technical Support', descAr: 'فريق مؤهل جاهز للتدخل الميداني.', descEn: 'Qualified team ready for field intervention.' },
            { titleAr: 'صديق للبيئة بالكامل', titleEn: 'Fully Eco-Friendly', descAr: 'نظام رقمي يقلل البصمة الكربونية.', descEn: 'Digital system that reduces carbon footprint.' }
        ],
        fleet: [],
        partners: [],
        contactTitleAr: 'هل لديك مشروع؟ تواصل معنا',
        contactTitleEn: 'Have a Project? Get in Touch',
        contactDescAr: 'فريقنا جاهز لتقديم استشارة فنية مجانية.',
        contactDescEn: 'Our team is ready to provide a free consultation.',
        contactRecipientEmail: '',
        contactPhone: '',
        contactLocationAr: '',
        contactLocationEn: '',
        storeUrl: '',
        showCompanyField: true,
        showPhoneField: true,
        portalBtnTextAr: 'بوابة الموظفين',
        portalBtnTextEn: 'Employee Portal',
        portalIconType: 'shield',
        footerAboutAr: 'شركة الرسالة الواضحة العالمية — شريككم في الاستدامة البيئية',
        footerAboutEn: 'Global Clear Mission Co. — Your partner in environmental sustainability',
        copyrightTextAr: '© 2025 جميع الحقوق محفوظة لشركة الرسالة الواضحة العالمية (GCM)',
        copyrightTextEn: '© 2025 All Rights Reserved — Global Clear Mission Co. (GCM)',
        socialLinks: [],
        seo: {
            metaTitleAr: 'GCM | شركة الرسالة الواضحة العالمية',
            metaTitleEn: 'GCM | Global Clear Mission',
            metaDescAr: 'إدارة نفايات وحلول بيئية بالسعودية',
            metaDescEn: 'Waste management and environmental solutions in KSA',
            headerScripts: '',
            footerScripts: '',
            googleAnalyticsId: ''
        }
    },
    store_page: {
        heroTitleAr: 'متجر الأجهزة البيئية',
        heroTitleEn: 'Environmental Equipment Store',
        heroDescAr: 'نقدم أحدث الحلول والتقنيات العالمية لرصد وحماية البيئة. حلول متكاملة تناسب احتياجات منشآتكم.',
        heroDescEn: 'Providing the latest global solutions and technologies for environmental monitoring and protection.'
    }
};

module.exports = {
    SCHEMA,
    PK_MAP,
    DEFAULT_SaaS_CONFIG
};
