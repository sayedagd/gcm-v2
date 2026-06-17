import type { SaaSConfig } from '@/types';

type JsonRecord = Record<string, unknown>;

const parseJsonObject = (value: unknown): JsonRecord | undefined => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      return undefined;
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return undefined;
};

const emptyLandingPage = (): SaaSConfig['landingPage'] => ({
  heroTitleAr: '',
  heroTitleEn: '',
  heroDescAr: '',
  heroDescEn: '',
  heroBgUrl: '',
  heroStats: [],
  trustBadges: [],
  aboutTitleAr: '',
  aboutTitleEn: '',
  aboutDescAr: '',
  aboutDescEn: '',
  aboutTextAr: '',
  aboutTextEn: '',
  aboutImageUrl: '',
  experienceYears: 0,
  projectsCount: '',
  clientsCount: '',
  vehiclesCount: '',
  complianceTextAr: '',
  complianceTextEn: '',
  servicesSectionTitleAr: '',
  servicesSectionTitleEn: '',
  servicesSectionDescAr: '',
  servicesSectionDescEn: '',
  services: [],
  certifications: [],
  whyChooseUs: [],
  fleetSectionTitleAr: '',
  fleetSectionTitleEn: '',
  fleetSectionDescAr: '',
  fleetSectionDescEn: '',
  fleet: [],
  partnersSectionTitleAr: '',
  partnersSectionTitleEn: '',
  partners: [],
  contactTitleAr: '',
  contactTitleEn: '',
  contactDescAr: '',
  contactDescEn: '',
  contactRecipientEmail: '',
  contactPhone: '',
  contactLocationAr: '',
  contactLocationEn: '',
  storeUrl: '',
  showCompanyField: true,
  showSubjectField: true,
  showPhoneField: true,
  portalBtnTextAr: '',
  portalBtnTextEn: '',
  portalIconType: 'shield',
  footerAboutAr: '',
  footerAboutEn: '',
  copyrightTextAr: '',
  copyrightTextEn: '',
  socialLinks: [],
  seo: {
    metaTitleAr: '',
    metaTitleEn: '',
    metaDescAr: '',
    metaDescEn: '',
    googleAnalyticsId: '',
    keywordsAr: '',
    keywordsEn: '',
    headerScripts: '',
    bodyScripts: '',
    footerScripts: '',
  },
  carbon: {
    badgeAr: '',
    badgeEn: '',
    titleAr: '',
    titleEn: '',
    descAr: '',
    descEn: '',
    footerTitleAr: '',
    footerTitleEn: '',
    footerDescAr: '',
    footerDescEn: '',
  },
  systemShowcase: { stats: [] },
});

export const createEmptySaaSConfig = (): SaaSConfig => ({
  appNameAr: '',
  appNameEn: '',
  appSloganAr: '',
  appSloganEn: '',
  primaryColor: '',
  logoUrl: '',
  logoDarkUrl: '',
  language: 'ar',
  cloudUrl: '',
  apiConfig: { baseUrl: '', version: '', apiKey: '', timeout: 0 },
  landingPage: emptyLandingPage(),
  storePage: { heroTitleAr: '', heroTitleEn: '', heroDescAr: '', heroDescEn: '' },
  bootConfig: { backgroundColor: '', textColor: '', accentColor: '', logoDuration: 0, showSlogan: false, loadingTextAr: '', loadingTextEn: '' },
  aiAssistant: { enabled: false, name: '', nameAr: '', position: 'bottom-right', iconStyle: 'sparkles', color: '' },
  managementControlsEnabled: false,
  templateConfig: { manifest: {}, deliveryNote: {}, global: {} },
  support_phone: '',
  support_whatsapp: '',
});

export const mapSystemConfigToSaaSConfig = (config: JsonRecord | null | undefined): SaaSConfig => {
  const empty = createEmptySaaSConfig();
  const source = config || {};
  const aiAssistant = parseJsonObject(source.ai_assistant) as SaaSConfig['aiAssistant'] | undefined;
  const templateConfig = parseJsonObject(source.template_config) as SaaSConfig['templateConfig'] | undefined;
  const bootConfig: NonNullable<SaaSConfig['bootConfig']> = {
    backgroundColor: '',
    textColor: '',
    accentColor: '',
    logoDuration: 0,
    showSlogan: false,
    loadingTextAr: '',
    loadingTextEn: '',
  };
  const fallbackAiAssistant: NonNullable<SaaSConfig['aiAssistant']> = {
    enabled: false,
    name: '',
    nameAr: '',
    position: 'bottom-right',
    iconStyle: 'sparkles',
    color: '',
  };
  const fallbackTemplateConfig: NonNullable<SaaSConfig['templateConfig']> = {
    manifest: {},
    deliveryNote: {},
    global: {},
  };

  return {
    ...empty,
    appNameAr: typeof source.app_name_ar === 'string' ? source.app_name_ar : empty.appNameAr,
    appNameEn: typeof source.app_name_en === 'string' ? source.app_name_en : empty.appNameEn,
    appSloganAr: typeof source.app_slogan_ar === 'string' ? source.app_slogan_ar : empty.appSloganAr,
    appSloganEn: typeof source.app_slogan_en === 'string' ? source.app_slogan_en : empty.appSloganEn,
    primaryColor: typeof source.primary_color === 'string' ? source.primary_color : empty.primaryColor,
    logoUrl: typeof source.logo_url === 'string' ? source.logo_url : '',
    logoDarkUrl: typeof source.logo_dark_url === 'string' ? source.logo_dark_url : '',
    language: source.language === 'en' ? 'en' : 'ar',
    cloudUrl: typeof source.cloud_url === 'string' ? source.cloud_url : '',
    apiConfig: {
      ...empty.apiConfig,
      baseUrl: typeof source.api_base_url === 'string' ? source.api_base_url : empty.apiConfig.baseUrl,
      version: typeof source.api_version === 'string' ? source.api_version : empty.apiConfig.version,
      timeout: typeof source.api_timeout === 'number' ? source.api_timeout : empty.apiConfig.timeout,
      ...(typeof source.api_key === 'string' && source.api_key ? { apiKey: source.api_key } : {}),
    },
    landingPage: (parseJsonObject(source.landing_page) as SaaSConfig['landingPage'] | undefined) || empty.landingPage,
    storePage: (parseJsonObject(source.store_page) as SaaSConfig['storePage'] | undefined) || empty.storePage,
    bootConfig: (parseJsonObject(source.boot_config) as SaaSConfig['bootConfig'] | undefined) || bootConfig,
    aiAssistant: (aiAssistant || fallbackAiAssistant),
    managementControlsEnabled: typeof source.management_controls_enabled === 'boolean' ? source.management_controls_enabled : false,
    templateConfig: (templateConfig || fallbackTemplateConfig),
    support_phone: typeof source.support_phone === 'string' ? source.support_phone : '',
    support_whatsapp: typeof source.support_whatsapp === 'string' ? source.support_whatsapp : '',
  };
};