import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Trip, Project, Service, Vehicle, Driver, Company, TemplateConfig, Supplier } from '@/types';
import { formatDate, safeParseArray, resolveImagePath } from './helpers';
import { toast } from './toast';

// Helper to inject global print Header (Side-aligned)
const getGlobalPrintHeader = (isAr: boolean, templateConfig?: TemplateConfig, titleFallback?: string) => {
    const config = templateConfig?.global;
    const accentColor = config?.accentColor || '#10b981';
    const hasCustomHeader = !!(config?.headerTextAr || config?.headerTextEn || config?.logoOverride);

    if (!hasCustomHeader) {
        if (!titleFallback) return '';
        return `
            <div style="border-bottom: 3px solid ${accentColor}; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">${titleFallback}</h1>
            </div>
        `;
    }

    return `
        <div style="border-bottom: 3px solid ${accentColor}; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 15px;">
                ${config!.logoOverride ? `<img src="${config!.logoOverride}" style="height: 55px; object-fit: contain;" />` : ''}
                <div>
                    ${config!.headerTextAr ? `<div style="font-size: 14px; font-weight: 800; color: #0f172a; direction: rtl;">${config!.headerTextAr}</div>` : ''}
                    ${config!.headerTextEn ? `<div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px;">${config!.headerTextEn}</div>` : ''}
                </div>
            </div>
            ${titleFallback ? `<div style="font-size: 11px; font-weight: 800; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.1em; text-align: right;">${titleFallback}</div>` : ''}
        </div>
    `;
};

// [NEW] Modular helper for the Stylish Centered Logo Header
const getCenteredPrintHeader = (isAr: boolean, templateConfig?: TemplateConfig, titleFallback?: string) => {
    const config = templateConfig?.global;
    const accentColor = config?.accentColor || '#10b981';
    const logo = config?.logoOverride || (window.location.origin + '/logo-light.png');

    return `
        <div style="text-align: center; margin-bottom: 30px; position: relative;">
            <div style="display: inline-block; padding: 15px; background: white; border-radius: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-bottom: 15px; border: 1px solid #f1f5f9;">
                <img src="${logo}" style="height: 65px; object-fit: contain; display: block;" />
            </div>
            <div style="text-align: center;">
                <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px;">
                    ${isAr ? 'جي سي ام لإدارة النفايات' : 'GCM WASTE MANAGEMENT'}
                </h2>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 5px;">
                    <span style="height: 1.5px; width: 30px; background: ${accentColor}40;"></span>
                    <p style="margin: 0; color: #64748b; font-weight: 800; text-transform: uppercase; font-size: 9px; letter-spacing: 2px;">
                        ${titleFallback || (isAr ? 'وثيقة عمليات ميدانية' : 'FIELD OPERATIONS DOCUMENT')}
                    </p>
                    <span style="height: 1.5px; width: 30px; background: ${accentColor}40;"></span>
                </div>
            </div>
        </div>
    `;
};

// [NEW] Scaled down version of the Centered Header for dense documents (Manifest/Delivery)
const getSmallCenteredPrintHeader = (isAr: boolean, templateConfig?: TemplateConfig, titleFallback?: string) => {
    const config = templateConfig?.global;
    const accentColor = config?.accentColor || '#10b981';
    const logo = config?.logoOverride || (window.location.origin + '/logo-light.png');

    return `
        <div style="text-align: center; margin-bottom: 15px; position: relative;">
            <div style="display: inline-block; padding: 10px; background: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 8px; border: 1px solid #f1f5f9;">
                <img src="${logo}" style="height: 48px; object-fit: contain; display: block;" />
            </div>
            <div style="text-align: center;">
                <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #1e293b; letter-spacing: -0.3px;">
                    ${isAr ? 'جي سي ام لإدارة النفايات' : 'GCM WASTE MANAGEMENT'}
                </h2>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px;">
                    <span style="height: 2px; width: 25px; background: ${accentColor}40;"></span>
                    <p style="margin: 0; color: #64748b; font-weight: 800; text-transform: uppercase; font-size: 8px; letter-spacing: 1.5px;">
                        ${titleFallback || (isAr ? 'وثيقة عمليات ميدانية' : 'FIELD OPERATIONS DOCUMENT')}
                    </p>
                    <span style="height: 2px; width: 25px; background: ${accentColor}40;"></span>
                </div>
            </div>
        </div>
    `;
};

// Helper to inject global print Footer + Legal Certification
const getGlobalPrintFooter = (isAr: boolean, templateConfig?: TemplateConfig) => {
    const config = templateConfig?.global;
    const accentColor = config?.accentColor || '#10b981';
    const hasCustomFooter = !!(config?.footerTextAr || config?.footerTextEn);

    return `
        <div style="margin-top: auto; padding-top: 12px; page-break-inside: avoid;">
            ${hasCustomFooter ? `
                <div style="border-top: 2px solid ${accentColor}; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b; margin-bottom: 10px;">
                    ${config!.footerTextEn ? `<div style="margin-bottom: 3px;">${config!.footerTextEn}</div>` : ''}
                    ${config!.footerTextAr ? `<div style="direction: rtl;">${config!.footerTextAr}</div>` : ''}
                </div>
            ` : ''}
            <div style="border-top: 1.5px solid #e2e8f0; padding-top: 10px; text-align: center;">
                <div style="display: inline-block; margin-bottom: 4px;">
                    <div style="width: 60px; height: 1.5px; background: ${accentColor}; margin: 0 auto 6px auto; border-radius: 2px;"></div>
                </div>
                <div style="font-size: 9px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; margin-bottom: 2px;">
                    This is an officially certified document issued by Global Clear Message Company (GCM)
                </div>
                <div style="font-size: 9px; font-weight: 800; color: #1e293b; direction: rtl; letter-spacing: 0.3px; margin-bottom: 4px;">
                    هذا مستند رسمي معتمد صادر عن شركة الرسالة الواضحة العالمية (جي سي ام)
                </div>
                <div style="font-size: 7.5px; font-weight: 700; color: #94a3b8; letter-spacing: 0.3px;">
                    Legally & financially binding · ملزم محاسبياً وقانونياً
                </div>
            </div>
        </div>
    `;
};


export interface ExportOptions {
    includeSummary: boolean;
    includeManifest: boolean;
    includeDeliveryNote: boolean;
    includeRecycleReceipt: boolean;
    includeProofImages?: boolean;
    accentColor?: string;
}

export const generateManifestBase64 = async (
    trip: Trip,
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    facilities: any[],
    templateConfig?: TemplateConfig
): Promise<string> => {
    const html = _getManifestHtml(trip, projects, drivers, vehicles, services, companies, facilities, {
        ...templateConfig?.manifest,
        ...(templateConfig?.global?.accentColor ? { accentColor: templateConfig.global.accentColor } : {})
    });
    return await _htmlToBase64Image(html);
};

export const generateDeliveryNoteBase64 = async (
    trip: Trip,
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    facilities: any[],
    templateConfig?: TemplateConfig
): Promise<string> => {
    const html = _getServiceNoteHtml(trip, projects, drivers, vehicles, services, companies, facilities, {
        ...templateConfig?.deliveryNote,
        ...(templateConfig?.global?.accentColor ? { accentColor: templateConfig.global.accentColor } : {})
    });
    return await _htmlToBase64Image(html);
};

export const generateBulkPdf = async (
    trips: Trip[],
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    suppliers: any[],
    facilities: any[],
    isAr: boolean,
    options: ExportOptions = {
        includeSummary: true,
        includeManifest: true,
        includeDeliveryNote: true,
        includeRecycleReceipt: true,
        includeProofImages: false,
        accentColor: '#10b981'
    },
    templateConfig?: TemplateConfig
): Promise<void> => {
    // [EN] Force all printed documents to English regardless of system language
    // [AR] جميع المستندات المطبوعة تصدر بالإنجليزية دائماً
    isAr = false;

    // Add specific print styles to hide browser headers/footers
    const styleFix = `
        @page {
            size: A4 portrait;
            margin: 0mm;
        }
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const mergedTemplateConfig = {
        ...templateConfig,
        global: {
            ...templateConfig?.global,
            ...((options.accentColor || templateConfig?.global?.accentColor)
                ? { accentColor: (options.accentColor || templateConfig?.global?.accentColor) }
                : {})
        }
    } as TemplateConfig;
    const accentColor = options.accentColor || templateConfig?.global?.accentColor || '#10b981';

    const content = `
        <!DOCTYPE html>
        <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
            <meta charset="UTF-8" />
            <title>GCM - Bulk Operational Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif; 
                    margin: 0; padding: 0; background: #fdfdfd; color: #1e293b;
                }
                
                .trip-section, .doc-page { 
                    background: white;
                    width: 210mm;
                    height: 297mm;
                    margin: 0 auto;
                    padding: 15mm;
                    box-sizing: border-box;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    border: 1px solid #e2e8f0; /* The Page Frame */
                    overflow: hidden;
                }

                .doc-page.no-padding { padding: 0; border: none; }

                .header-container {
                    border-top: 2px solid ${accentColor};
                    padding-top: 20px;
                    margin-bottom: 25px;
                }

                .title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .report-title {
                    font-size: 22px;
                    font-weight: 900;
                    color: ${accentColor};
                    margin: 0;
                }

                .trip-id-badge {
                    background: ${accentColor}10;
                    color: ${accentColor};
                    padding: 6px 15px;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 14px;
                    border: 1px solid ${accentColor}30;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }

                .info-block {
                    border-top: 1px solid #f1f5f9;
                    padding-top: 8px;
                }

                .block-header {
                    font-size: 8px;
                    font-weight: 900;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 8px;
                }

                .data-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    padding-bottom: 3px;
                    border-bottom: 1px dashed #f1f5f9;
                }

                .data-label { font-size: 10px; color: #64748b; font-weight: 600; }
                .data-value { font-size: 11px; color: #1e293b; font-weight: 700; text-align: ${isAr ? 'left' : 'right'}; }

                .notes-section {
                    margin-top: auto;
                    padding: 15px;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 20px;
                }
                .notes-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }

                .doc-img-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #f1f5f9;
                    background: #fcfcfc;
                    border-radius: 8px;
                    overflow: hidden;
                    padding: 10px;
                }
                .doc-img { max-width: 100%; max-height: 180mm; object-fit: contain; }

                body > *:last-child { page-break-after: auto !important; }

                ${styleFix}

                @media print {
                    body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                    .trip-section, .doc-page { margin: 0; border: 1px solid #e2e8f0; width: 210mm; height: 297mm; overflow: hidden; page-break-inside: avoid; }
                    .doc-page.no-padding { padding: 0; border: none; }
                    img { max-width: 100%; height: auto; object-fit: contain; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:9999;">
                <button onclick="window.print()" style="padding:10px 25px; background:${accentColor}; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:900;">
                    ${isAr ? 'طباعة التقرير المجمع' : 'PRINT BULK REPORT'}
                </button>
            </div>
            ${trips.map(trip => {
        const project = projects.find(p => p.project_id === trip.project_id);
        const company = companies.find(c => c.company_id === project?.company_id);
        const driver = drivers.find(d => d.driver_id === trip.driver_id);
        const vehicle = vehicles.find(v => v.vehicle_id === trip.vehicle_id);
        const service = services.find(s => s.service_id === trip.service_id);
        const facility = facilities.find((f: any) => f.facility_id === (trip as any).facility_id || f.facility_id === (trip as any).destination_facility_id);
        const isExternal = vehicle?.ownership_type === 'SUPPLIER';
        const supplier = isExternal ? (suppliers as any[]).find(s => s.supplier_id === vehicle.supplier_id) : null;

        const centeredHeader = (title: string) => getCenteredPrintHeader(isAr, mergedTemplateConfig, title);
        const tripGlobalFooter = getGlobalPrintFooter(isAr, mergedTemplateConfig);

        let tripHtml = '';

        // 1. Detailed Summary Page (Ticket)
        if (options.includeSummary) {
            tripHtml += _getTripTicketHtml(trip, projects, drivers, vehicles, services, companies, suppliers as any[], facilities as any[], isAr, mergedTemplateConfig);
        }

        // 2. Manifest — show uploaded image if available, otherwise generate
        if (options.includeManifest) {
            const hasUploadedManifest = trip.manifest_file && !trip.is_manifest_generated;
            if (hasUploadedManifest) {
                tripHtml += `
                    <div class="doc-page">
                        ${centeredHeader(isAr ? 'مانفيست النفايات' : 'WASTE MANIFEST')}
                        <div style="border-top: 2px solid ${accentColor}; padding-top: 20px; margin-bottom: 10px; text-align: center;">
                            <div style="font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 10px;">MANIFEST REF: ${trip.waste_manifest_no || 'N/A'}</div>
                        </div>
                        <div class="doc-img-container" style="flex:1; display:flex; align-items:center; justify-content:center; margin-top:10px; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
                            <img src="${resolveImagePath(trip.manifest_file!)}" style="max-width:100%; max-height:180mm; object-fit:contain;" />
                        </div>
                        ${tripGlobalFooter}
                    </div>
                `;
            } else {
                const manifestHtml = _getManifestHtml(trip, projects, drivers, vehicles, services, companies, facilities, {
                    accentColor,
                    logoOverride: templateConfig?.global?.logoOverride,
                    footerTextAr: templateConfig?.global?.footerTextAr,
                    footerTextEn: templateConfig?.global?.footerTextEn
                });
                tripHtml += `
                    <div class="doc-page no-padding">
                        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; border: 1px solid #e2e8f0; box-sizing:border-box;">
                            ${manifestHtml}
                        </div>
                    </div>
                `;
            }
        }

        // 3. Delivery Note — show uploaded image if available, otherwise generate
        if (options.includeDeliveryNote) {
            const hasUploadedDN = trip.delivery_note_file && !trip.is_delivery_note_generated;
            if (hasUploadedDN) {
                tripHtml += `
                    <div class="doc-page">
                        ${centeredHeader(isAr ? 'سند التسليم' : 'DELIVERY NOTE')}
                        <div style="border-top: 2px solid ${accentColor}; padding-top: 20px; margin-bottom: 10px; text-align: center;">
                            <div style="font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 10px;">DN REF: ${trip.delivery_note_no || 'N/A'}</div>
                        </div>
                        <div class="doc-img-container" style="flex:1; display:flex; align-items:center; justify-content:center; margin-top:10px; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
                            <img src="${resolveImagePath(trip.delivery_note_file!)}" style="max-width:100%; max-height:180mm; object-fit:contain;" />
                        </div>
                        ${tripGlobalFooter}
                    </div>
                `;
            } else {
                const dnHtml = _getServiceNoteHtml(trip, projects, drivers, vehicles, services, companies, facilities, {
                    accentColor,
                    logoOverride: templateConfig?.global?.logoOverride,
                    footerTextAr: templateConfig?.global?.footerTextAr,
                    footerTextEn: templateConfig?.global?.footerTextEn
                });
                tripHtml += `
                    <div class="doc-page no-padding">
                        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; border: 1px solid #e2e8f0; box-sizing:border-box;">
                            ${dnHtml}
                        </div>
                    </div>
                `;
            }
        }

        // [New] 4. Recycle Receipt / Uploaded Evidence
        if (options.includeRecycleReceipt) {
            tripHtml += `
                <div class="doc-page">
                    ${centeredHeader(isAr ? 'إيصال التدوير / التفريغ' : 'RECYCLE / DISCHARGE RECEIPT')}
                    <div style="border-top: 2px solid ${accentColor}; padding-top: 20px; margin-bottom: 20px; text-align: center;">
                        <div style="font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 10px;">RECEIPT REFERENCE: ${trip.recycle_receipt_no || 'N/A'}</div>
                    </div>
                    <div class="doc-img-container" style="flex:1; display:flex; align-items:center; justify-content:center; margin-top:15px; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
                        ${trip.recycle_file ? `<img src="${resolveImagePath(trip.recycle_file)}" style="max-width:100%; max-height:180mm; object-fit:contain;" />` : `<div style="font-size:12px; color:#94a3b8; font-weight:bold;">${isAr ? 'لم يتم رفع صورة لإيصال المردم' : 'No recycle receipt image uploaded'}</div>`}
                    </div>
                    ${tripGlobalFooter}
                </div>
            `;
        }



        // 6. Proof Images
        const baseImages = safeParseArray(trip.proof_images) || [];
        const containerImages = [
            trip.request_container_image,
            trip.container_image_before,
            trip.container_image_after
        ].filter(Boolean);
        const allProofImages = [...baseImages, ...containerImages];

        if (options.includeProofImages && allProofImages.length > 0) {
            tripHtml += `
                <div class="doc-page">
                    ${centeredHeader(isAr ? 'صور إثبات العمليات' : 'OPERATIONAL PROOF IMAGES')}
                    <div style="border-top:1px solid ${accentColor}; margin-top:10px; padding-top:15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        ${allProofImages.map(img => `<div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; height:110mm;"><img src="${resolveImagePath(img)}" style="width:100%; height:100%; object-fit:cover;" /></div>`).join('')}
                    </div>
                    ${tripGlobalFooter}
                </div>
            `;
        }

        return tripHtml;
    }).join('')}
            <script>window.onload = () => setTimeout(() => window.print(), 1000);</script>
        </body>
        </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
};

/**
 * Copies a pre-formatted analytical prompt to the clipboard.
 */
export const copyAIPrompt = async (trips: Trip[], isAr: boolean) => {
    const totalVolume = trips.reduce((acc, t) => acc + Number(t.quantity || 0), 0);
    const firstTrip = trips[0];
    const lastTrip = trips[trips.length - 1];
    const startDate = firstTrip?.date || 'N/A';
    const endDate = lastTrip?.date || 'N/A';

    const prompt = `
I am providing operational data from the GCM Waste Management System for the period ${startDate} to ${endDate}.
This dataset includes ${trips.length} completed trips with a total volume of ${totalVolume.toFixed(2)} units.

Please act as a Senior Operations Analyst and perform the following:
1. **Efficiency Audit**: Identify which projects or services are most/least efficient based on trip frequency and quantity.
2. **Driver Performance**: Scan for anomalies in driver assignments, trip times, or missing documentation.
3. **Volume Trends**: Analyze if the waste generation is steady or if there are spikes that need attention.
4. **Actionable Recommendations**: Give 3-5 specific recommendations to optimize logistics and improve data quality for the next month.

I have uploaded the detailed trip logs in Markdown format and/or the full Excel export. Use them as your primary context.
    `.trim();

    try {
        await navigator.clipboard.writeText(prompt);
        toast.success(isAr ? 'تم نسخ الأمر للذكاء الاصطناعي بنجاح!' : 'AI Prompt copied to clipboard successfully!');
    } catch (err) {
        console.error('Failed to copy prompt', err);
        toast.error(isAr ? 'فشل نسخ الأمر' : 'Failed to copy prompt');
    }
};

/**
 * Generates a structured Markdown file optimized for LLM analysis (e.g., NotebookLM).
 */
export const generateAIContext = (
    trips: Trip[],
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[]
) => {
    const lines: string[] = [];

    lines.push(`# GCM Waste Management Operational Report`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Total Trips: ${trips.length}`);
    lines.push(`Total Volume: ${trips.reduce((acc, t) => acc + Number(t.quantity || 0), 0).toFixed(2)}`);
    lines.push(`---`);
    lines.push(``);

    lines.push(`## Executive Summary`);
    const activeProjects = new Set(trips.map(t => t.project_id)).size;
    const activeDrivers = new Set(trips.map(t => t.driver_id)).size;
    lines.push(`Operational activity covered ${activeProjects} projects utilizing ${activeDrivers} drivers.`);
    lines.push(``);

    lines.push(`## Trip Details`);

    trips.forEach(t => {
        const project = projects.find(p => p.project_id === t.project_id);
        const company = companies.find(c => c.company_id === project?.company_id);
        const driver = drivers.find(d => d.driver_id === t.driver_id);
        const vehicle = vehicles.find(v => v.vehicle_id === t.vehicle_id);
        const service = services.find(s => s.service_id === t.service_id);

        lines.push(`### Trip ${t.trip_id}`);
        lines.push(`- **Date/Time**: ${t.date} ${t.time}`);
        lines.push(`- **Client**: ${company?.company_name || 'N/A'} - ${project?.project_name || t.project_id}`);
        lines.push(`- **Execution**: Driver ${driver?.name || t.driver_id} using Vehicle ${vehicle?.plate_no || t.vehicle_id} (${vehicle?.vehicle_type || 'N/A'})`);
        lines.push(`- **Service**: ${service?.service_name || t.service_id}`);
        lines.push(`- **Output**: ${t.quantity} ${t.unit} (Status: ${t.status})`);
        if (t.notes) lines.push(`- **Notes**: ${t.notes}`);
        lines.push(``);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GCM_AI_Context_${format(new Date(), 'yyyyMMdd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates a detailed Excel report with all trip parameters.
 */
export const generateExcelReport = (
    trips: Trip[],
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[]
) => {
    const data = trips.map(t => {
        const project = projects.find(p => p.project_id === t.project_id);
        const company = companies.find(c => c.company_id === project?.company_id);
        const driver = drivers.find(d => d.driver_id === t.driver_id);
        const vehicle = vehicles.find(v => v.vehicle_id === t.vehicle_id);
        const service = services.find(s => s.service_id === t.service_id);

        return {
            'Trip ID': t.trip_id,
            'Date': t.date,
            'Time': t.time,
            'Status': t.status,
            'Priority': t.priority || 'NORMAL',

            // Client & Project Info
            'Company ID': t.company_id,
            'Company Name': company?.company_name || 'N/A',
            'Project ID': t.project_id,
            'Project Name': project?.project_name || 'N/A',
            'Project Location': project?.location || 'N/A',

            // Service Info
            'Service ID': t.service_id,
            'Service Name': service?.service_name || 'N/A',
            'Quantity': t.quantity,
            'Unit': t.unit,
            'Container size': t.container_size || 'N/A',

            // Logistics Info
            'Driver ID': t.driver_id,
            'Driver Name': driver?.name || 'N/A',
            'Vehicle ID': t.vehicle_id,
            'Vehicle Plate': vehicle?.plate_no || 'N/A',
            'Vehicle Type': vehicle?.vehicle_type || 'N/A',
            'Facility ID': t.facility_id || 'N/A',

            // Documentation
            'Waste Manifest No': t.waste_manifest_no || 'N/A',
            'Delivery Note No': t.delivery_note_no || 'N/A',
            'Recycle Receipt No': t.recycle_receipt_no || 'N/A',

            // Supervision
            'Supervisor Name': t.supervisor_name || 'N/A',
            'GCM Supervisor Name': t.gcm_supervisor_name || 'N/A',

            // Geographic Data
            'Trip GPS URL': t.trip_location_url || 'N/A',
            'Request GPS URL': t.request_location_url || 'N/A',

            // Lifecycle Timestamps
            'Assigned At': t.assigned_at || 'N/A',
            'Driver Accepted At': t.driver_accepted_at || 'N/A',
            'Client Approved At': t.client_approved_at || 'N/A',

            // Metadata & Links
            'Hub Link': t.hub_link || 'N/A',
            'Proof Image Count': (t.proof_images || []).length,
            'Has Manifest Doc': t.manifest_file ? 'YES' : 'NO',
            'Has Delivery Note Doc': t.delivery_note_file ? 'YES' : 'NO',
            'Has Recycle Doc': t.recycle_file ? 'YES' : 'NO',
            'Notes': t.notes || ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips');
    XLSX.writeFile(workbook, `GCM_Full_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};
/**
 * Common Styles Helper
 */
const _getCommonPrintStyles = (accentColor: string) => `
    .document-page { font-size: 11px; }
    .document-page table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    .document-page td, .document-page th { border: 1px solid #333; padding: 6px; }
    /* ... additional overrides if needed ... */
`;

const _getTripTicketHtml = (
    trip: Trip,
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    suppliers: any[],
    facilities: any[],
    _isAr: boolean,
    templateConfig?: TemplateConfig
): string => {
    // [EN] Force ticket to English regardless of system language
    const isAr = false;

    const project = projects.find(p => p.project_id === trip.project_id);
    const company = companies.find(c => c.company_id === project?.company_id);
    const driver = drivers.find(d => d.driver_id === trip.driver_id);
    const vehicle = vehicles.find(v => v.vehicle_id === trip.vehicle_id);
    const service = services.find(s => s.service_id === trip.service_id);
    const facility = facilities.find((f: any) => f.facility_id === (trip as any).facility_id || f.facility_id === (trip as any).destination_facility_id);

    const isExternal = vehicle?.ownership_type === 'SUPPLIER';
    const supplier = isExternal ? suppliers.find(s => s.supplier_id === vehicle.supplier_id) : null;

    const globalFooter = getGlobalPrintFooter(isAr, templateConfig);
    const accentColor = templateConfig?.global?.accentColor || '#10b981';

    return `
            <style>
                .ticket-wrapper {
                    background: white;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                    border-radius: 16px;
                    padding: 20px 24px;
                    max-width: 850px;
                    margin: 0 auto;
                    border: 1px solid #e2e8f0;
                    position: relative;
                }
                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px;
                }
                .ticket-meta { text-align: ${isAr ? 'left' : 'right'}; }
                .ticket-id { 
                    background: ${accentColor}10; 
                    color: ${accentColor}; 
                    padding: 6px 14px; 
                    border-radius: 10px; 
                    font-weight: 800; 
                    font-size: 16px; 
                    border: 1.5px solid ${accentColor}30; 
                    display: inline-block;
                }
                .date-badge {
                    margin-top: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    background: #f1f5f9;
                    padding: 3px 10px;
                    border-radius: 100px;
                }
                .main-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 12px; 
                    margin-bottom: 10px; 
                }
                .info-section { 
                    background: #fdfdfd; 
                    border-radius: 12px; 
                    padding: 12px 14px; 
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .section-title { 
                    font-size: 9px; 
                    font-weight: 800; 
                    color: ${accentColor}; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                    margin-bottom: 8px; 
                    border-bottom: 2px solid ${accentColor}15; 
                    padding-bottom: 4px; 
                }
                .detail-row { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 5px; 
                    border-bottom: 1px dashed #f1f5f9; 
                    padding-bottom: 3px; 
                }
                .detail-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
                .detail-value { font-size: 11px; font-weight: 800; color: #1e293b; }
                
                .cargo-banner {
                    background: #1e293b;
                    border-radius: 14px;
                    padding: 14px 20px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    position: relative;
                    overflow: hidden;
                }
                .cargo-banner::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 200px;
                    height: 200px;
                    background: ${accentColor};
                    filter: blur(80px);
                    opacity: 0.2;
                }
                .cargo-main h2 { margin: 0; font-size: 9px; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; }
                .cargo-main .service-name { font-size: 15px; font-weight: 800; margin-top: 3px; color: white; }
                .cargo-qty { text-align: right; }
                .qty-val { font-size: 28px; font-weight: 900; line-height: 1; }
                .qty-unit { font-size: 14px; color: #64748b; font-weight: 700; margin-left: 5px; }

                .tracking-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .tracking-box {
                    background: #f8fafc;
                    padding: 8px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                }
                .track-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                .track-val { font-size: 11px; font-weight: 800; color: #334155; }

                .signatures-grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 10px; 
                    margin-top: 12px; 
                }
                .sig-box { 
                    border: 1.5px dashed #cbd5e1; 
                    border-radius: 10px; 
                    padding: 8px; 
                    text-align: center; 
                    height: 80px; 
                    display: flex; 
                    flex-direction: column; 
                    background: #fdfdfd;
                }
                .sig-img { 
                    max-width: 100%; 
                    max-height: 45px; 
                    object-fit: contain; 
                    margin: auto;
                    mix-blend-mode: multiply;
                }
                .sig-placeholder {
                    width: 50px;
                    height: 1px;
                    background: #cbd5e1;
                    margin: auto;
                }
                .sig-label { 
                    font-size: 8px; 
                    font-weight: 800; 
                    color: #94a3b8; 
                    text-transform: uppercase; 
                    margin-top: 4px;
                    background: #f1f5f9;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                
            </style>
            
            <div class="trip-section no-padding ticket-wrapper" style="box-shadow: none; border-radius: 0; max-width: 100%; border:none; padding: 10mm 5mm;">
                <div style="text-align: center; margin-bottom: 10px; position: relative;">
                    <div style="display: inline-block; padding: 8px; background: white; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 6px; border: 1px solid #f1f5f9;">
                        <img src="${templateConfig?.global?.logoOverride || '/logo-light.png'}" style="height: 40px; object-fit: contain; display: block;" />
                    </div>
                    <div style="text-align: center;">
                        <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px;">${isAr ? 'جي سي ام لإدارة النفايات' : 'GCM WASTE MANAGEMENT'}</h2>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 3px;">
                            <span style="height: 1.5px; width: 25px; background: ${accentColor}40;"></span>
                            <p style="margin: 0; color: #64748b; font-weight: 800; text-transform: uppercase; font-size: 8px; letter-spacing: 2px;">${isAr ? 'تذكرة العمليات الميدانية' : 'FIELD OPERATIONS TICKET'}</p>
                            <span style="height: 1.5px; width: 25px; background: ${accentColor}40;"></span>
                        </div>
                    </div>
                </div>

                <div class="header-top" style="border-top: 2px solid ${accentColor}; padding-top: 10px; border-bottom: none;">
                    <div style="flex: 1;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-size: 11px; font-weight: 800; color: #0f172a; direction: ${isAr ? 'rtl' : 'ltr'};">${templateConfig?.global?.headerTextAr || ''}</div>
                            <div style="font-size: 10px; font-weight: 700; color: #475569;">${templateConfig?.global?.headerTextEn || ''}</div>
                        </div>
                    </div>
                    <div class="ticket-meta">
                        <div class="ticket-id" style="color:${accentColor}; background:${accentColor}10; border-color:${accentColor}30;"># ${trip.trip_id}</div>
                        <div class="date-badge">${format(new Date(trip.date || Date.now()), 'EEEE, MMM do, yyyy')} • ${trip.time || ''}</div>
                    </div>
                </div>

                <div class="main-grid">
                    <div class="info-section">
                        <div class="section-title">${isAr ? 'الأطراف المتعاقدة' : 'CONTRACTUAL PARTIES'}</div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'العميل الرائد' : 'Prime Client'}</span>
                            <span class="detail-value">${company?.company_name || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'الموقع / المشروع' : 'Site / Project'}</span>
                            <span class="detail-value">${project?.project_name || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'مشرف الموقع' : 'Site Supervisor'}</span>
                            <span class="detail-value">${trip.supervisor_name || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'مُقدم الخدمة' : 'Service Provider'}</span>
                            <span class="detail-value">${isExternal ? (supplier?.name || (isAr ? 'خارجي' : 'External')) : (isAr ? 'جي سي ام لإدارة النفايات' : 'GCM Waste Management')}</span>
                        </div>
                    </div>

                    <div class="info-section">
                        <div class="section-title">${isAr ? 'الوحدات اللوجستية' : 'LOGISTICS UNITS'}</div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'رقم اللوحة' : 'Plate ID'}</span>
                            <span class="detail-value">${vehicle?.plate_no || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'طراز الوحدة' : 'Unit Class'}</span>
                            <span class="detail-value">${vehicle?.vehicle_type || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'القائد المسؤول' : 'Pilot in Charge'}</span>
                            <span class="detail-value">${driver?.name || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${isAr ? 'رقم السائق' : 'Driver Ref'}</span>
                            <span class="detail-value">${driver?.driver_id || '---'}</span>
                        </div>
                    </div>
                </div>

                <div class="info-section" style="margin-bottom: 10px;">
                    <div class="section-title">${isAr ? 'بيانات المردم / جهة التفريغ' : 'DISCHARGE FACILITY DATA'}</div>
                    <div class="main-grid" style="margin-bottom: 0;">
                        <div class="detail-row" style="margin-bottom: 0; border:none; padding:0;">
                            <span class="detail-label">${isAr ? 'اسم الموقع / المردم' : 'Landfill / Store'}</span>
                            <span class="detail-value" style="font-size: 12px; color:${accentColor};">${facility?.facility_name || (isAr ? 'غير محدد' : 'Not Assigned')}</span>
                        </div>
                        <div class="detail-row" style="margin-bottom: 0; border:none; padding:0;">
                            <span class="detail-label">${isAr ? 'نوع المنشأة' : 'Facility Type'}</span>
                            <span class="detail-value">${facility?.type || '---'}</span>
                        </div>
                    </div>
                </div>

                <div class="cargo-banner">
                    <div class="cargo-main">
                        <h2>${isAr ? 'وصف الحمولة والخدمة' : 'Payload & Service Analysis'}</h2>
                        <div class="service-name">${service?.service_name || (isAr ? 'خدمات إدارة النفايات العامة' : 'General Waste Logistics')}</div>
                    </div>
                    <div class="cargo-qty">
                        <span class="qty-val">${trip.quantity}</span>
                        <span class="qty-unit">${trip.unit}</span>
                    </div>
                </div>

                <div class="tracking-grid">
                    <div class="tracking-box">
                        <div class="track-label">${isAr ? 'رقم المانفيست' : 'Manifest Ref'}</div>
                        <div class="track-val">${trip.waste_manifest_no || '---'}</div>
                    </div>
                    <div class="tracking-box">
                        <div class="track-label">${isAr ? 'سند التسليم' : 'Delivery Note'}</div>
                        <div class="track-val">${trip.delivery_note_no || '---'}</div>
                    </div>
                    <div class="tracking-box">
                        <div class="track-label">${isAr ? 'إيصال المردم' : 'Recycle Receipt'}</div>
                        <div class="track-val">${trip.recycle_receipt_no || '---'}</div>
                    </div>
                </div>

                ${trip.notes ? `
                    <div class="info-section" style="margin-bottom: 8px; border-left: 3px solid #fbbf24; background: #fffbeb;">
                        <div class="section-title" style="color:#d97706; border-bottom-color:#fef3c7;">${isAr ? 'ملاحظات تشغيلية' : 'Operational Intelligence'}</div>
                        <p style="margin:0; font-size: 10px; font-weight: 600; line-height: 1.4; color:#92400e;">${trip.notes}</p>
                    </div>
                ` : ''}

                <div class="signatures-grid">
                    <div class="sig-box" style="position: relative;">
                        <div class="sig-label">${isAr ? 'توقيع العميل' : 'Site Client Sig'}</div>
                        ${trip.client_signature || trip.supervisor_signature ? `<img src="${trip.client_signature || trip.supervisor_signature}" class="sig-img" />` : '<div class="sig-placeholder"></div>'}
                        ${trip.client_stamp ? `<img src="${trip.client_stamp}" style="position: absolute; right: 2px; bottom: 18px; width: 55px; height: 55px; object-fit: contain; opacity: 0.75; mix-blend-mode: multiply; transform: rotate(-8deg);" />` : ''}
                        <div style="font-size: 9px; font-weight: 700; margin-top: 5px;">${trip.supervisor_name || '---'}</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-label">${isAr ? 'توقيع السائق' : 'Driver Signature'}</div>
                        <div class="sig-placeholder"></div>
                    </div>
                    <div class="sig-box" style="position: relative;">
                        <div class="sig-label">${isAr ? 'اعتماد GCM' : 'GCM Authorization'}</div>
                        ${trip.gcm_signature ? `<img src="${trip.gcm_signature}" class="sig-img" />` : '<div class="sig-placeholder"></div>'}
                        ${trip.gcm_stamp ? `<img src="${trip.gcm_stamp}" style="position: absolute; right: 2px; bottom: 18px; width: 55px; height: 55px; object-fit: contain; opacity: 0.75; mix-blend-mode: multiply; transform: rotate(-5deg);" />` : ''}
                        <div style="font-size: 9px; font-weight: 700; margin-top: 5px;">${trip.gcm_supervisor_name || '---'}</div>
                    </div>
                </div>

                ${globalFooter}
            </div>
    `;
};

/**
 * Filters trips based on AI-extracted criteria.
 */
export const filterTripsForAI = (
    trips: Trip[],
    options: { project_id?: string; start_date?: string; end_date?: string }
): Trip[] => {
    return trips.filter(t => {
        const matchesProject = !options.project_id || t.project_id === options.project_id;

        let matchesDate = true;
        if (options.start_date || options.end_date) {
            const tripDate = new Date(t.date);
            const start = options.start_date ? new Date(options.start_date) : new Date(0);
            const end = options.end_date ? new Date(options.end_date) : new Date();
            // Set time to start/end of day for robustness
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            matchesDate = tripDate >= start && tripDate <= end;
        }

        return matchesProject && matchesDate;
    });
};

// --- PRIVATE HELPERS ---

interface ManifestTemplateOpts {
    headerTextAr?: string | undefined;
    headerTextEn?: string | undefined;
    footerTextAr?: string | undefined;
    footerTextEn?: string | undefined;
    showLogo?: boolean | undefined;
    showSignatures?: boolean | undefined;
    logoOverride?: string | undefined;
    accentColor?: string | undefined;
}

interface DeliveryNoteTemplateOpts {
    headerTextAr?: string | undefined;
    headerTextEn?: string | undefined;
    footerTextAr?: string | undefined;
    footerTextEn?: string | undefined;
    showLogo?: boolean | undefined;
    showQR?: boolean | undefined;
    showSignatures?: boolean | undefined;
    logoOverride?: string | undefined;
    accentColor?: string | undefined;
}

const _getManifestHtml = (
    trip: Trip,
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    facilities: any[],
    opts?: ManifestTemplateOpts
) => {
    const project = projects.find(p => p.project_id === trip.project_id);
    const company = companies.find(c => c.company_id === project?.company_id);
    const driver = drivers.find(d => d.driver_id === trip.driver_id);
    const vehicle = vehicles.find(v => v.vehicle_id === trip.vehicle_id);
    const service = services.find(s => s.service_id === trip.service_id);
    const parentService = service?.parent_id ? services.find(s => s.service_id === service.parent_id) : null;
    const facility = facilities.find((f: any) => f.facility_id === (trip as any).facility_id || f.facility_id === (trip as any).destination_facility_id);
    const accentColor = opts?.accentColor || '#1a3a6b';
    const logoUrl = opts?.logoOverride || '';
    const footerAr = opts?.footerTextAr || '';
    const footerEn = opts?.footerTextEn || '';

    // Determine service name for checkbox matching
    const svcName = (service?.service_name || '').toLowerCase();
    const parentName = (parentService?.service_name || '').toLowerCase();
    const allNames = `${svcName} ${parentName}`;

    // Checkbox helper
    const chk = (checked: boolean) => checked
        ? `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid ${accentColor};background:${accentColor};margin-right:4px;vertical-align:middle;text-align:center;line-height:11px;color:#fff;font-size:8px;font-weight:bold;">✓</span>`
        : `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid ${accentColor};background:#fff;margin-right:4px;vertical-align:middle;"></span>`;

    // Match waste type
    const match = (keywords: string[]) => keywords.some(k => allNames.includes(k));

    // Non-Hazardous waste types
    const nonHaz = [
        { label: 'Paper', checked: match(['paper']) },
        { label: 'Cardboard', checked: match(['cardboard']) },
        { label: 'Wood', checked: match(['wood']) },
        { label: 'Plastic', checked: match(['plastic']) },
        { label: 'Metal / Steel', checked: match(['metal', 'steel']) },
        { label: 'Concrete', checked: match(['concrete']) && !match(['wash']) },
        { label: 'Food Waste', checked: match(['food']) },
        { label: 'General Waste', checked: match(['general']) },
        { label: 'Asphalt', checked: match(['asphalt']) },
        { label: 'Glass', checked: match(['glass']) },
        { label: 'Excavated Material', checked: match(['excavat']) },
        { label: 'Electronic (specify)', checked: match(['electronic']) && !match(['hazard']) },
    ];

    // Hazardous waste types
    const haz = [
        { label: 'Oils / Fuels / Oily Water', checked: match(['oil', 'fuel', 'oily']) },
        { label: 'Tires', checked: match(['tire', 'tyre']) },
        { label: 'Concrete Wash Water', checked: match(['concrete wash', 'wash water']) },
        { label: 'Sewage', checked: match(['sewage', 'sewer']) },
        { label: 'Contaminated Material', checked: match(['contaminated material']) },
        { label: 'Contaminated Soil', checked: match(['contaminated soil']) },
        { label: 'Rags / Drums / Filters', checked: match(['rag', 'drum', 'filter']) },
        { label: 'Batteries', checked: match(['batter']) },
        { label: 'Asbestos', checked: match(['asbest']) },
        { label: 'Medical', checked: match(['medic']) },
        { label: 'Electronic (specify)', checked: match(['electronic']) && match(['hazard']) },
        { label: 'Other (            )', checked: false },
    ];

    // Supplying water types
    const water = [
        { label: 'Sweet water', checked: match(['sweet water']) },
        { label: 'Drinking water', checked: match(['drinking']) },
        { label: 'Dust control', checked: match(['dust']) },
    ];

    // Quantity checkboxes
    const qtyOptions = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 30, 32];
    const tripQty = parseFloat(String(trip.quantity)) || 0;
    const unitLabel = trip.unit || 'TON';

    const buildRow = (i: number) => {
        const nh = nonHaz[i] || null;
        const hz = haz[i] || null;
        const wt = water[i] || null;
        const qt = qtyOptions[i] !== undefined ? qtyOptions[i] : null;
        const isOtherQty = i === 11;
        return `<tr style="border-bottom:1px solid #c0c8d8;">
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${nh ? `${chk(nh.checked)} ${nh.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${hz ? `${chk(hz.checked)} ${hz.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${wt ? `${chk(wt.checked)} ${wt.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;text-align:center;border-right:1px solid #c0c8d8;">${isOtherQty ? `${chk(!qtyOptions.includes(tripQty) && tripQty > 0)} Other ( ${!qtyOptions.includes(tripQty) && tripQty > 0 ? tripQty : ''} )` : (qt !== null ? `${chk(tripQty === qt)} ${qt} ${unitLabel}` : '')}</td>
            <td style="padding:3px 6px;font-size:10px;">&nbsp;</td>
        </tr>`;
    };

    const rows = Array.from({ length: 12 }, (_, i) => buildRow(i)).join('');

    // Client Approval Logic
    const isClientApproved = trip.client_approved || !!(trip.client_signature || trip.supervisor_signature);
    const clientNameStr = isClientApproved ? (trip.supervisor_name || 'Authorized Client Representative') : '';
    let clientSigHtml = '';
    if (isClientApproved) {
        if (trip.client_signature || trip.supervisor_signature || trip.client_stamp) {
            clientSigHtml = `
                <div style="position: relative; display: inline-block;">
                    ${trip.client_signature || trip.supervisor_signature ? `<img src="${trip.client_signature || trip.supervisor_signature}" style="max-height:60px; max-width:150px; object-fit:contain; margin-top:5px; mix-blend-mode: multiply;"/>` : ''}
                    ${trip.client_stamp ? `<img src="${trip.client_stamp}" style="position: absolute; right: -30px; top: -5px; max-height: 60px; max-width: 60px; object-fit: contain; opacity: 0.85; mix-blend-mode: multiply;" />` : ''}
                </div>
            `;
        } else {
            clientSigHtml = `<div style="color:${accentColor}; font-weight:800; font-size:11px; margin-top:25px; letter-spacing:1px;">DIGITALLY APPROVED</div>`;
        }
    }

    return `
    <style>
      .gcm-mnf-page {
        background: #fff;
        width: 794px;
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
        color: #1a1a1a;
        box-sizing: border-box;
      }
      .gcm-mnf-number {
        color: red;
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 6px;
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .gcm-mnf-no-label {
        color: black;
        font-size: 14px;
        font-weight: normal;
      }
      .gcm-mnf-header {
        background: ${accentColor};
        color: white;
        text-align: center;
        padding: 8px 12px;
        font-size: 18px;
        font-weight: bold;
        display: grid;
        grid-template-columns: 60px 1fr 60px;
        align-items: center;
      }
      .gcm-mnf-logo {
        width: 54px;
        height: 54px;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .gcm-mnf-table { border-collapse: collapse; width: 100%; margin-top: 0; }
      .gcm-mnf-table td, .gcm-mnf-table th { border: 1px solid #333; font-size: 11px; padding: 6px 8px; vertical-align: middle; text-align: center; }
      .gcm-mnf-bold { font-weight: bold; background: #f8fafc; }
      .gcm-mnf-center { text-align: center; }
      .gcm-mnf-bg-gray { background: #e8e8e8; }
      .gcm-mnf-value { 
        font-weight: 800; 
        color: ${accentColor}; 
        background: #f0fdfa; 
        border: 1px solid ${accentColor}44;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        display: inline-block;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .gcm-mnf-cb { 
        display: flex; 
        align-items: center; 
        gap: 6px; 
        margin-bottom: 4px; 
        line-height: 1.2; 
        text-align: left;
        justify-content: flex-start;
      }
      .gcm-mnf-section-wrap { display: flex; border: 1px solid #333; border-top: none; }
      .gcm-mnf-section-side {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        font-weight: bold;
        font-size: 12px;
        letter-spacing: 2px;
        padding: 8px 4px;
        border-right: 1px solid #333;
        text-align: center;
        background: white;
        min-width: 22px;
        color: ${accentColor};
      }
      .gcm-mnf-section-body { flex: 1; }
      .gcm-mnf-sign-box { height: 70px; }
    </style>

    <div class="gcm-mnf-page">
      <div class="gcm-mnf-number" style="margin-bottom: 5px;">
        <span class="gcm-mnf-no-label">No.</span> ${trip.waste_manifest_no || '---'}
      </div>

      ${getSmallCenteredPrintHeader(false, { global: { accentColor, logoOverride: logoUrl } }, 'WASTE MANAGEMENT MANIFEST')}

      <table class="gcm-mnf-table">
        <tr>
          <td class="gcm-mnf-bold" style="width:140px; border-top:none;">Generator Name</td>
          <td class="gcm-mnf-value" style="width:300px; border-top:none;">${company?.company_name || '---'}</td>
          <td class="gcm-mnf-bold" style="width:120px; border-top:none;">Manifest No.</td>
          <td class="gcm-mnf-value" style="width:120px; border-top:none;">${trip.waste_manifest_no || '---'}</td>
        </tr>
        <tr>
          <td class="gcm-mnf-bold">Project Name</td>
          <td class="gcm-mnf-value">${project?.project_name || '---'}</td>
          <td class="gcm-mnf-bold">Waste Removal Date</td>
          <td class="gcm-mnf-value">${trip.date || '---'}</td>
        </tr>
      </table>

      <table class="gcm-mnf-table" style="border-top:none;">
        <tr>
          <td colspan="4" class="gcm-mnf-bold gcm-mnf-center gcm-mnf-bg-gray" style="border-top:none; border-bottom: 2px solid ${accentColor};">Type of Waste Collected</td>
        </tr>
        <tr>
          <td class="gcm-mnf-bold gcm-mnf-center gcm-mnf-bg-gray" style="width:22%;">Non-Hazardous</td>
          <td class="gcm-mnf-bold gcm-mnf-center gcm-mnf-bg-gray" style="width:25%;">Hazardous</td>
          <td class="gcm-mnf-bold gcm-mnf-center gcm-mnf-bg-gray" style="width:18%;">Quantity</td>
          <td class="gcm-mnf-bold gcm-mnf-center gcm-mnf-bg-gray" style="width:35%;">Skip Color Code</td>
        </tr>
        <tr>
          <td style="padding:5px;">
            ${nonHaz.map(n => `<div class="gcm-mnf-cb">${chk(n.checked)} <span class="${n.checked ? 'gcm-mnf-value' : ''}">${n.label}</span></div>`).join('')}
          </td>
          <td style="padding:5px;">
            ${haz.map(h => `<div class="gcm-mnf-cb">${chk(h.checked)} <span class="${h.checked ? 'gcm-mnf-value' : ''}">${h.label}</span></div>`).join('')}
          </td>
          <td style="padding:5px;">
            ${qtyOptions.map(q => `<div class="gcm-mnf-cb">${chk(tripQty === q)} <strong class="${tripQty === q ? 'gcm-mnf-value' : ''}">${q} ${unitLabel}</strong></div>`).join('')}
            <div class="gcm-mnf-cb">${chk(!qtyOptions.includes(tripQty) && tripQty > 0)} Other (<span class="gcm-mnf-value">${!qtyOptions.includes(tripQty) && tripQty > 0 ? tripQty : ''}</span>)</div>
          </td>
          <td style="padding:5px;">
            <div class="gcm-mnf-cb">${chk(false)} Designated Yard</div>
            <div class="gcm-mnf-cb">${chk(false)} White (paper) Beibe</div>
            <div class="gcm-mnf-cb">${chk(false)} (Cardboard) Brown</div>
            <div class="gcm-mnf-cb">${chk(false)} (Wood) Light Blue</div>
            <div class="gcm-mnf-cb">${chk(false)} (Plastic) Gray</div>
            <div class="gcm-mnf-cb">${chk(false)} (Metal Scrap) Red</div>
            <div class="gcm-mnf-cb">${chk(false)} (Hazardous) Black</div>
            <div class="gcm-mnf-cb">${chk(false)} (General) Green</div>
            <div class="gcm-mnf-cb">${chk(false)} (Food) Yellow</div>
            <div class="gcm-mnf-cb">${chk(false)} (Concrete) Light</div>
            <div class="gcm-mnf-cb">${chk(false)} (Glass) Green</div>
          </td>
        </tr>
      </table>

      <div style="border:1px solid #333; border-top:none; padding:6px; font-size:10.5px; line-height:1.5;">
        <strong style="font-size:11px;">GENERATOR'S CERTIFICATION:</strong> I hereby declare that the contents of this consignment are fully and accurately described
        above and are appropriately classified, packaged, and labelled in accordance with the applicable laws and regulations of the kingdom.
      </div>

      <div class="gcm-mnf-section-wrap">
        <div class="gcm-mnf-section-side">GENERATOR</div>
        <div class="gcm-mnf-section-body">
          <table class="gcm-mnf-table" style="border:none;">
            <tr>
              <td class="gcm-mnf-bold" style="width:180px; border-left:none; border-top:none;">Authorized Representative</td>
              <td class="gcm-mnf-value" style="border-left:none; border-top:none; border-right:none; font-weight: bold; color: #1e293b;">${trip.client_approved ? clientNameStr : ''}</td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none; border-bottom:none;">Sign / Stamp</td>
              <td class="gcm-mnf-sign-box" style="border-left:none; border-bottom:none; border-right:none; text-align: center; vertical-align: middle;">
                ${trip.client_approved ? clientSigHtml : ''}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="gcm-mnf-section-wrap">
        <div class="gcm-mnf-section-side">TRANSPORTER</div>
        <div class="gcm-mnf-section-body">
          <table class="gcm-mnf-table" style="border:none;">
            <tr>
              <td class="gcm-mnf-bold" style="width:180px; border-left:none; border-top:none;">Waste Transporter – Representative</td>
              <td class="gcm-mnf-value" style="border-left:none; border-top:none; border-right:none;">${driver?.name || '---'}</td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none;">Tel. No.</td>
              <td style="border-left:none; border-right:none;"></td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none;">Company Name</td>
              <td class="gcm-mnf-value" style="border-left:none; border-right:none;">Global Clear Mission</td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none;">Vehicle No. (Truck Head Plate)</td>
              <td class="gcm-mnf-value" style="border-left:none; border-right:none;">${vehicle?.plate_no || '---'}</td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none;">Permit No.</td>
              <td style="border-left:none; border-right:none;"></td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none;">Date</td>
              <td class="gcm-mnf-value" style="border-left:none; border-right:none;">${trip.date || '---'}</td>
            </tr>
            <tr>
              <td class="gcm-mnf-bold" style="border-left:none; border-bottom:none;">Sign / stamp</td>
              <td class="gcm-mnf-sign-box" style="border-left:none; border-bottom:none; border-right:none; text-align: center; vertical-align: middle; position: relative;">
                 ${trip.gcm_signature ? `<img src="${trip.gcm_signature}" style="max-height:65px; max-width:160px; object-fit:contain; mix-blend-mode: multiply; display: inline-block;"/>` : ''}
                 ${trip.gcm_stamp ? `<img src="${trip.gcm_stamp}" style="position: absolute; right: 8px; top: 2px; max-height: 70px; max-width: 70px; object-fit: contain; opacity: 0.75; mix-blend-mode: multiply; transform: rotate(-6deg);" />` : ''}
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="gcm-mnf-section-wrap">
        <div class="gcm-mnf-section-side">RECEIVER</div>
        <div style="flex:1; display:flex; flex-direction:column;">
          <div style="display:flex; border-bottom:1px solid #333;">
            <div style="flex:1; border-right:1px solid #333; font-weight:bold; font-size:11px; padding:3px 5px;">Discrepancy Indication Space</div>
            <div style="flex:1; font-weight:bold; font-size:11px; padding:3px 5px;">Waste Receiving Facility - Representative</div>
          </div>
          <div style="display:flex; flex:1;">
            <div style="flex:1; border-right:1px solid #333; min-height:160px; padding:5px;"></div>
            <div style="flex:1;">
              <table class="gcm-mnf-table" style="height:100%; border:none;">
                <tr>
                  <td class="gcm-mnf-bold" style="background:#f0f0f0; width:140px; border:none; border-bottom:1px solid #333; border-right:1px solid #333;">Facility Owner / Operator</td>
                  <td style="border:none; border-bottom:1px solid #333;"></td>
                </tr>
                <tr>
                  <td class="gcm-mnf-bold" style="background:#f0f0f0; border:none; border-bottom:1px solid #333; border-right:1px solid #333;">Designation</td>
                  <td style="border:none; border-bottom:1px solid #333;"></td>
                </tr>
                <tr>
                  <td class="gcm-mnf-bold" style="background:#f0f0f0; border:none; border-bottom:1px solid #333; border-right:1px solid #333;">Facility Name</td>
                  <td class="gcm-mnf-value" style="border:none; border-bottom:1px solid #333;">${(facility as any)?.name || '---'}</td>
                </tr>
                <tr>
                  <td class="gcm-mnf-bold" style="background:#f0f0f0; border:none; border-bottom:1px solid #333; border-right:1px solid #333;">Date</td>
                  <td class="gcm-mnf-value" style="border:none; border-bottom:1px solid #333;">${trip.date ? new Date(trip.date).toLocaleDateString('en-GB') : '---'}</td>
                </tr>
                <tr>
                  <td class="gcm-mnf-bold" style="background:#f0f0f0; border:none; border-right:1px solid #333;">Sign / Stamp</td>
                  <td style="height:70px; border:none;"></td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div style="margin-top:10px; text-align:center;">
        <div style="font-size:9px; color:#666;">
          P.O. Box 12831, Riyadh 7221 - Kingdom of Saudi Arabia Tel: +966114720027<br>
          E-mail: info@gcm-gulf.com / Web: www.gcm-gulf.com
          ${footerEn ? `<div style="font-weight:bold; color:${accentColor};">${footerEn}</div>` : ''}
        </div>
      </div>
    </div>
    `;
};

const _getServiceNoteHtml = (
    trip: Trip,
    projects: Project[],
    drivers: Driver[],
    vehicles: Vehicle[],
    services: Service[],
    companies: Company[],
    facilities: any[],
    opts?: DeliveryNoteTemplateOpts
) => {
    const project = projects.find(p => p.project_id === trip.project_id);
    const company = companies.find(c => c.company_id === project?.company_id);
    const driver = drivers.find(d => d.driver_id === trip.driver_id);
    const vehicle = vehicles.find(v => v.vehicle_id === trip.vehicle_id);
    const service = services.find(s => s.service_id === trip.service_id);
    const parentService = service?.parent_id ? services.find(s => s.service_id === service.parent_id) : null;
    const showSignatures = opts?.showSignatures !== false;
    const logoUrl = opts?.logoOverride || '';
    const footerAr = opts?.footerTextAr || '';
    const footerEn = opts?.footerTextEn || '';

    const accentColor = opts?.accentColor || '#1a1a5e';

    // Determine service name for checkbox matching
    const svcName = (service?.service_name || '').toLowerCase();
    const parentName = (parentService?.service_name || '').toLowerCase();
    const allNames = `${svcName} ${parentName}`;

    // Checkbox helper
    const chk = (checked: boolean) => checked
        ? `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid ${accentColor};background:${accentColor};margin-right:4px;vertical-align:middle;text-align:center;line-height:11px;color:#fff;font-size:8px;font-weight:bold;">✓</span>`
        : `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid ${accentColor};background:#fff;margin-right:4px;vertical-align:middle;"></span>`;

    // Match waste type
    const match = (keywords: string[]) => keywords.some(k => allNames.includes(k));

    // Non-Hazardous waste types
    const nonHaz = [
        { label: 'Paper', checked: match(['paper']) },
        { label: 'Cardboard', checked: match(['cardboard']) },
        { label: 'Wood', checked: match(['wood']) },
        { label: 'Plastic', checked: match(['plastic']) },
        { label: 'Metal / Steel', checked: match(['metal', 'steel']) },
        { label: 'Concrete', checked: match(['concrete']) && !match(['wash']) },
        { label: 'Food Waste', checked: match(['food']) },
        { label: 'General Waste', checked: match(['general']) },
        { label: 'Asphalt', checked: match(['asphalt']) },
        { label: 'Glass', checked: match(['glass']) },
        { label: 'Excavated Material', checked: match(['excavat']) },
        { label: 'Electronic (specify)', checked: match(['electronic']) && !match(['hazard']) },
    ];

    // Hazardous waste types
    const haz = [
        { label: 'Oils / Fuels / Oily Water', checked: match(['oil', 'fuel', 'oily']) },
        { label: 'Tires', checked: match(['tire', 'tyre']) },
        { label: 'Concrete Wash Water', checked: match(['concrete wash', 'wash water']) },
        { label: 'Sewage', checked: match(['sewage', 'sewer']) },
        { label: 'Contaminated Material', checked: match(['contaminated material']) },
        { label: 'Contaminated Soil', checked: match(['contaminated soil']) },
        { label: 'Rags / Drums / Filters', checked: match(['rag', 'drum', 'filter']) },
        { label: 'Batteries', checked: match(['batter']) },
        { label: 'Asbestos', checked: match(['asbest']) },
        { label: 'Medical', checked: match(['medic']) },
        { label: 'Electronic (specify)', checked: match(['electronic']) && match(['hazard']) },
        { label: 'Other (            )', checked: false },
    ];

    // Supplying water types
    const water = [
        { label: 'Sweet water', checked: match(['sweet water']) },
        { label: 'Drinking water', checked: match(['drinking']) },
        { label: 'Dust control', checked: match(['dust']) },
    ];

    // Quantity checkboxes
    const qtyOptions = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 30, 32];
    const tripQty = parseFloat(String(trip.quantity)) || 0;
    const unitLabel = trip.unit || 'TON';

    const buildRow = (i: number) => {
        const nh = nonHaz[i] || null;
        const hz = haz[i] || null;
        const wt = water[i] || null;
        const qt = qtyOptions[i] !== undefined ? qtyOptions[i] : null;
        const isOtherQty = i === 11;
        return `<tr style="border-bottom:1px solid #c0c8d8;">
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${nh ? `${chk(nh.checked)} ${nh.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${hz ? `${chk(hz.checked)} ${hz.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;border-right:1px solid #c0c8d8;">${wt ? `${chk(wt.checked)} ${wt.label}` : ''}</td>
            <td style="padding:3px 6px;font-size:10px;text-align:center;border-right:1px solid #c0c8d8;">${isOtherQty ? `${chk(!qtyOptions.includes(tripQty) && tripQty > 0)} Other ( ${!qtyOptions.includes(tripQty) && tripQty > 0 ? tripQty : ''} )` : (qt !== null ? `${chk(tripQty === qt)} ${qt} ${unitLabel}` : '')}</td>
            <td style="padding:3px 6px;font-size:10px;">&nbsp;</td>
        </tr>`;
    };

    const rows = Array.from({ length: 12 }, (_, i) => buildRow(i)).join('');

    // Client Approval Logic
    const isClientApproved = trip.client_approved || !!(trip.client_signature || trip.supervisor_signature);
    const clientNameStr = isClientApproved ? (trip.supervisor_name || 'Contractor Representative') : '';
    let clientSigHtml = '';
    if (isClientApproved) {
        if (trip.client_signature || trip.supervisor_signature || trip.client_stamp) {
            clientSigHtml = `
                <div style="position: relative; display: inline-block;">
                    ${trip.client_signature || trip.supervisor_signature ? `<img src="${trip.client_signature || trip.supervisor_signature}" style="max-height:60px; max-width:150px; object-fit:contain; margin-top:5px; mix-blend-mode: multiply;"/>` : ''}
                    ${trip.client_stamp ? `<img src="${trip.client_stamp}" style="position: absolute; right: -30px; top: -5px; max-height: 60px; max-width: 60px; object-fit: contain; opacity: 0.85; mix-blend-mode: multiply;" />` : ''}
                </div>
            `;
        } else {
            clientSigHtml = `<div style="color:${accentColor}; font-weight:800; font-size:12px; margin-top:25px; letter-spacing:1px;">DIGITALLY APPROVED</div>`;
        }
    }

    return `
    <style>
      .gcm-sn-page {
        background: #fff;
        width: 850px;
        margin: 0;
        padding: 24px 28px 28px;
        font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
        color: ${accentColor};
        position: relative;
        box-sizing: border-box;
      }

      .gcm-sn-header {
        display: grid;
        grid-template-columns: 350px 1fr 350px;
        align-items: center;
        margin-bottom: 6px;
      }

      .gcm-sn-header-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .gcm-sn-title-box {
        background: ${accentColor}20;
        padding: 6px 18px;
        font-size: 18px;
        font-weight: 700;
        color: ${accentColor};
        letter-spacing: 1px;
        width: fit-content;
        border-left: 4px solid ${accentColor};
      }

      .gcm-sn-sn-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        background: ${accentColor}10;
        padding: 4px 12px;
        width: fit-content;
        min-width: 300px;
        border-right: 2px solid ${accentColor};
      }

      .gcm-sn-sn-label {
        font-weight: 700;
        color: ${accentColor};
        font-size: 14px;
      }

      .gcm-sn-sn-number {
        color: #cc0000;
        font-size: 18px;
        font-weight: 700;
        font-style: italic;
        letter-spacing: 2px;
        flex: 1;
        text-align: center;
      }

      .gcm-sn-logo-box {
        text-align: center;
      }

      .gcm-sn-logo-circle {
        display: none;
      }

      .gcm-sn-logo-circle::after {
        content: '®';
        position: absolute;
        top: 1px;
        right: 3px;
        font-size: 8px;
      }

      .gcm-sn-logo-name {
        font-size: 10px;
        font-weight: 700;
        color: ${accentColor};
        text-align: center;
        line-height: 1.3;
      }

      .gcm-sn-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        border: 1.5px solid ${accentColor};
      }

      .gcm-sn-info-table td {
        border: 1px solid ${accentColor};
        padding: 4px 8px;
        font-size: 12px;
        color: ${accentColor};
      }

      .gcm-sn-info-label {
        font-weight: 700;
        background: #f8fafc;
        white-space: nowrap;
        width: 120px;
      }

      .gcm-sn-info-value {
        min-width: 200px;
        background: #fff;
      }

      .gcm-sn-service-header {
        background: ${accentColor};
        text-align: center;
        font-weight: 700;
        font-size: 13px;
        color: #fff;
        padding: 4px;
        border: 1px solid ${accentColor};
        border-top: none;
      }

      .gcm-sn-main-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid ${accentColor};
        border-top: none;
        margin-top: 0;
      }

      .gcm-sn-main-table th, .gcm-sn-main-table td {
        border: 1px solid ${accentColor};
        padding: 3px 6px;
        font-size: 11.5px;
        color: ${accentColor};
        vertical-align: middle;
      }

      .gcm-sn-main-table th {
        background: #f8fafc;
        font-weight: 700;
        text-align: center;
        font-size: 12px;
        padding: 5px 6px;
      }

      .gcm-sn-cb-col {
        width: 22px;
        text-align: center;
        padding: 2px 3px !important;
      }

      .gcm-sn-label-col {
        padding: 3px 6px !important;
      }

      .gcm-sn-qty-check-row {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 2px 6px;
      }

      .gcm-sn-qty-label {
        font-size: 11px;
        color: ${accentColor};
        font-weight: 600;
      }

      .gcm-sn-sig-row {
        display: flex;
        justify-content: space-between;
        margin-top: 18px;
        padding: 0 10px;
      }

      .gcm-sn-sig-box {
        text-align: center;
        width: 200px;
      }

      .gcm-sn-sig-label {
        font-weight: 700;
        font-size: 13px;
        color: ${accentColor};
        border-top: 1.5px solid ${accentColor};
        padding-top: 4px;
        margin-top: 30px;
      }

      .gcm-sn-footer {
        text-align: center;
        margin-top: 20px;
        font-size: 11.5px;
        font-weight: 700;
        color: ${accentColor};
        line-height: 1.7;
      }
    </style>

    <div class="gcm-sn-page">
      ${getSmallCenteredPrintHeader(false, { global: { accentColor, logoOverride: logoUrl } }, 'SERVICE DELIVERY NOTE')}
      
      <div style="text-align: right; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 800; color: #475569;">SN.</span>
        <span style="font-size: 18px; font-weight: 900; color: #cc0000; letter-spacing: 1px;">${trip.delivery_note_no || trip.trip_id.slice(-5).toUpperCase()}</span>
      </div>

      <table class="gcm-sn-info-table">
        <tr>
          <td class="gcm-sn-info-label">Contractor Name:</td>
          <td class="gcm-sn-info-value">${company?.company_name || '---'}</td>
          <td class="gcm-sn-info-label" style="text-align:center;">Date.</td>
          <td class="gcm-sn-info-value">${trip.date || '---'}</td>
        </tr>
        <tr>
          <td class="gcm-sn-info-label">Project Name:</td>
          <td class="gcm-sn-info-value">${project?.project_name || '---'}</td>
          <td class="gcm-sn-info-label" style="text-align:center;">Waste Manifest No.</td>
          <td class="gcm-sn-info-value">${trip.waste_manifest_no || '---'}</td>
        </tr>
        <tr>
          <td class="gcm-sn-info-label">Driver Name:</td>
          <td class="gcm-sn-info-value">${driver?.name || '---'}</td>
          <td class="gcm-sn-info-label" style="text-align:center;">Vehicle Number.</td>
          <td class="gcm-sn-info-value">${vehicle?.plate_no || '---'}</td>
        </tr>
      </table>

      <div class="gcm-sn-service-header">Type of service</div>

      <table class="gcm-sn-main-table">
        <thead>
          <tr>
            <th colspan="2" style="width:22%;">Non-Hazardous waste</th>
            <th colspan="2" style="width:22%;">Hazardous waste</th>
            <th colspan="2" style="width:14%;">Supplying water</th>
            <th style="width:18%;">Quantity</th>
            <th style="width:24%;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 12 }, (_, i) => {
        const nh = nonHaz[i];
        const hz = haz[i];
        const wt = water[i];
        const qt = qtyOptions[i];
        const isOtherQty = i === 11;

        return `
          <tr>
            <td class="gcm-sn-cb-col">${nh ? chk(nh.checked) : ''}</td>
            <td class="gcm-sn-label-col">${nh ? nh.label : ''}</td>
            <td class="gcm-sn-cb-col">${hz ? chk(hz.checked) : ''}</td>
            <td class="gcm-sn-label-col">${hz ? hz.label : ''}</td>
            <td class="gcm-sn-cb-col">${wt ? chk(wt.checked) : ''}</td>
            <td class="gcm-sn-label-col">${wt ? wt.label : ''}</td>
            <td>
              ${isOtherQty
                ? `<div class="gcm-sn-qty-check-row">${chk(!qtyOptions.includes(tripQty) && tripQty > 0)} <span class="gcm-sn-qty-label">Other ( <span style="border-bottom:1px solid ${accentColor}; min-width:30px; display:inline-block;">${!qtyOptions.includes(tripQty) && tripQty > 0 ? tripQty : ''}</span> )</span></div>`
                : (qt !== undefined ? `<div class="gcm-sn-qty-check-row">${chk(tripQty === qt)} <span class="gcm-sn-qty-label">${qt} ${unitLabel}</span></div>` : '')}
            </td>
            ${i === 0 ? `<td rowspan="12" style="vertical-align:top; font-size:11px; padding:8px;">${trip.notes || ''}</td>` : ''}
          </tr>`;
    }).join('')}
        </tbody>
      </table>

      ${showSignatures ? `
      <div class="gcm-sn-sig-row">
        <div class="gcm-sn-sig-box">
          <div style="height: 80px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1e293b;">
             ${trip.gcm_signature || trip.gcm_stamp ? `
                <div style="position: relative; display: inline-block;">
                    ${trip.gcm_signature ? `<img src="${trip.gcm_signature}" style="max-height:70px; max-width:170px; object-fit:contain; margin-top:5px; mix-blend-mode: multiply;"/>` : ''}
                    ${trip.gcm_stamp ? `<img src="${trip.gcm_stamp}" style="position: absolute; right: -35px; top: -10px; max-height: 75px; max-width: 75px; object-fit: contain; opacity: 0.75; mix-blend-mode: multiply; transform: rotate(-5deg);" />` : ''}
                </div>
             ` : ''}
          </div>
          <div style="text-align: center; margin-top: -10px; margin-bottom: 5px; font-size: 10.5px; font-weight: bold; color: #1e293b;">
             ${trip.gcm_supervisor_name || ''}
          </div>
          <div class="gcm-sn-sig-label">Hauler Representative</div>
        </div>
        <div class="gcm-sn-sig-box">
          <div style="height: 70px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1e293b;">
             ${trip.client_approved ? clientSigHtml : ''}
          </div>
          <div style="text-align: center; margin-top: -10px; margin-bottom: 5px; font-size: 10.5px; font-weight: bold; color: #1e293b;">
             ${trip.client_approved ? clientNameStr : ''}
          </div>
          <div class="gcm-sn-sig-label">Contractor Representative</div>
        </div>
      </div>` : ''}

      <div class="gcm-sn-footer">
        ${footerEn ? `<div>${footerEn}</div>` : ''}
        ${!footerAr && !footerEn ? `
        P.O. Box 12831, Riyadh 7221 - Kingdom of Saudi Arabia Tel: +966114720027<br>
        E-mail: info@gcm-gulf.com / Web: www.gcm-gulf.com
        ` : ''}
      </div>
    </div>
    `;
};

const _htmlToBase64Image = async (html: string): Promise<string> => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '850px';
    wrapper.style.backgroundColor = '#ffffff';
    // Wrap to ensure styles + content are captured together
    wrapper.innerHTML = `<div id="gcm-export-wrapper">${html}</div>`;
    document.body.appendChild(wrapper);

    const elementToCapture = wrapper.querySelector('#gcm-export-wrapper') as HTMLElement;

    try {
        // Wait for images and layout
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(elementToCapture, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: true,
            ignoreElements: (element) => {
                if (element.hasAttribute('data-html2canvas-ignore')) return true;
                try {
                    const style = window.getComputedStyle(element);
                    if (style.backgroundImage && (style.backgroundImage.includes('color(') || style.backgroundImage.includes('oklch(') || style.backgroundImage.includes('color-mix('))) {
                        return true;
                    }
                } catch (e) { }
                return false;
            }
        });
        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
        console.error('PDF Conversion Error:', err);
        return '';
    } finally {
        if (wrapper && wrapper.parentNode) {
            document.body.removeChild(wrapper);
        }
    }
};

/**
 * Prints a Comprehensive Vehicle Dossier.
 */
export const printVehicleDossier = (
    vehicle: any,
    analyticsData: any,
    isAr: boolean,
    templateConfig?: any,
    progress: number = 0
): void => {
    const documents = vehicle.documents || [];
    const permits = (() => {
        try {
            return JSON.parse(vehicle.permit_zones || '[]');
        } catch {
            return [];
        }
    })();

    const recentTrips = (analyticsData.trips || []).slice(0, 10);
    const issueDate = new Date().toLocaleDateString();
    const centeredHeader = getCenteredPrintHeader(isAr, templateConfig, isAr ? 'ملف تعريف المركبة' : 'Vehicle Profile Dossier');
    const globalFooter = getGlobalPrintFooter(isAr, templateConfig);
    const accentColor = templateConfig?.global?.accentColor || '#10b981';

    const content = `
    <!DOCTYPE html>
    <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
            <meta charset="UTF-8" />
            <title>Vehicle Dossier - ${vehicle.plate_no}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif; 
                    margin: 0; padding: 40px; background: #fff; color: #1e293b;
                }
                
                .dossier-container { max-width: 1000px; margin: 0 auto; }
                
                .report-header-box {
                    border-top: 3.5px solid ${accentColor};
                    padding-top: 25px;
                    margin-bottom: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .brand-side h1 { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
                .brand-side p { margin: 4px 0 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }

                .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
                .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; text-align: center; }
                .stat-box-title { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 8px; letter-spacing: 1px; }
                .stat-box-value { font-size: 22px; font-weight: 900; color: ${accentColor}; }
                .stat-box.highlight { background: ${accentColor}08; border-color: ${accentColor}30; }

                .section-container { margin-bottom: 40px; }
                .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
                .section-title { font-size: 12px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: ${isAr ? 'right' : 'left'}; border-bottom: 1px solid #e2e8f0; }
                th { background: #f8fafc; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; }
                tr:last-child td { border-bottom: none; }
                
                .badge-lite { padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .status-active { background: #d1fae5; color: #065f46; }
                .status-expired { background: #fee2e2; color: #991b1b; }
                .status-near { background: #fef3c7; color: #92400e; }

                .image-appendix { margin-top: 50px; page-break-before: always; }
                .image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
                .img-container { border: 1px solid #e2e8f0; padding: 12px; border-radius: 14px; background: #fcfcfc; page-break-inside: avoid; }
                .img-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 10px; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; }
                .doc-image { width: 100%; height: auto; border-radius: 8px; display: block; }
                
                .visual-identity { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 35px; }
                .photo-box { border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: #f8fafc; page-break-inside: avoid; }
                .photo-img { width: 100%; height: 220px; object-fit: cover; display: block; }
                .photo-label { background: #f1f5f9; padding: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }

                @page { size: auto; margin: 0mm; }
                @media print {
                    body { padding: 0; -webkit-print-color-adjust: exact; margin: 0; }
                    .dossier-container { max-width: 100%; padding: 20mm; box-sizing: border-box; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:9999;">
                <button onclick="window.print()" style="padding:12px 25px; background:${accentColor}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:900; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    ${isAr ? 'طباعة ملف المركبة' : 'PRINT VEHICLE DOSSIER'}
                </button>
            </div>

            <div class="dossier-container">
                ${centeredHeader}

                <div class="report-header-box">
                    <div class="brand-side">
                        <p>${isAr ? 'بيانات أسطول النقل' : 'FLEET UNIT IDENTIFICATION'}</p>
                        <h1>${vehicle.plate_no}</h1>
                        <div style="display:flex; gap:8px; margin-top:12px;">
                            <span class="badge-lite" style="background:${accentColor}15; color:${accentColor}; border:1px solid ${accentColor}30;">${vehicle.vehicle_type}</span>
                            <span class="badge-lite status-active">${isAr ? 'نشط تشغيلياً' : 'OPERATIONAL'}</span>
                        </div>
                    </div>
                    <div style="text-align: ${isAr ? 'left' : 'right'};">
                        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Reference ID</div>
                        <div style="font-size: 14px; font-weight: 900; color: #1e293b;">#VEH-${vehicle.vehicle_id.toString().slice(-6).toUpperCase()}</div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 4px;">${issueDate}</div>
                    </div>
                </div>

                ${(vehicle.photo_front || vehicle.photo_back) ? `
                <div class="visual-identity">
                    ${vehicle.photo_front ? `
                        <div class="photo-box">
                            <img src="${vehicle.photo_front}" class="photo-img" />
                            <div class="photo-label">${isAr ? 'مشهد أمامي' : 'Front Viewport'}</div>
                        </div>
                    ` : ''}
                    ${vehicle.photo_back ? `
                        <div class="photo-box">
                            <img src="${vehicle.photo_back}" class="photo-img" />
                            <div class="photo-label">${isAr ? 'مشهد خلفي' : 'Rear Viewport'}</div>
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                <div class="grid">
                    <div class="stat-box highlight">
                        <div class="stat-box-title">${isAr ? 'نسبة الجاهزية' : 'Readiness Score'}</div>
                        <div class="stat-box-value">${progress}%</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-title">${isAr ? 'إجمالي العمليات' : 'Total Ops'}</div>
                        <div class="stat-box-value">${analyticsData.trips?.length || 0}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-title">${isAr ? 'إجمالي الحمولة' : 'Total Tons'}</div>
                        <div class="stat-box-value">${analyticsData.tonnage?.toFixed(1) || 0}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-title">${isAr ? 'كفاءة التشغيل' : 'Utilization'}</div>
                        <div class="stat-box-value">${analyticsData.utilizationRate?.toFixed(0) || 0}%</div>
                    </div>
                </div>

                <div class="section-container">
                    <div class="section-header">
                        <div class="section-title">${isAr ? 'المستندات القانونية والجاهزية' : 'Legal Compliance & Documents'}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'نوع المستند' : 'Document Type'}</th>
                                <th>${isAr ? 'الرقم المرجعي' : 'Ref Number'}</th>
                                <th>${isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                                <th>${isAr ? 'الحالة التشغيلية' : 'Operational Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${documents.map((doc: any) => {
        const statusClass = doc.status === 'ACTIVE' ? 'status-active' : doc.status === 'EXPIRED' ? 'status-expired' : 'status-near';
        return `
                                    <tr>
                                        <td><strong>${doc.type}</strong></td>
                                        <td>${doc.number || '---'}</td>
                                        <td>${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : '---'}</td>
                                        <td><span class="badge-lite ${statusClass}">${doc.status.replace('_', ' ')}</span></td>
                                    </tr>
                                `;
    }).join('')}
                            ${documents.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #94a3b8;">${isAr ? 'لا توجد مستندات مسجلة' : 'No compliance documents found.'}</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>

                ${permits.length > 0 ? `
                <div class="section-container">
                    <div class="section-header">
                        <div class="section-title">${isAr ? 'تصاريح المناطق الأمنية' : 'Security Zone Permits'}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'رقم التصريح' : 'Permit No'}</th>
                                <th>${isAr ? 'المنطقة الأمنية' : 'Restricted Zone'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${permits.map((p: any) => `
                                <tr>
                                    <td><strong>${p.no}</strong></td>
                                    <td>${p.zone || '---'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                ${recentTrips.length > 0 ? `
                <div class="section-container">
                    <div class="section-header">
                        <div class="section-title">${isAr ? 'آخر العمليات الميدانية' : 'Recent Field Operations'}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'التاريخ' : 'Date'}</th>
                                <th>ID</th>
                                <th>${isAr ? 'الحمولة' : 'Tonnage'}</th>
                                <th>${isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentTrips.map((t: any) => `
                                <tr>
                                    <td>${new Date(t.date).toLocaleDateString()}</td>
                                    <td>#${t.trip_id.slice(-6).toUpperCase()}</td>
                                    <td>${t.tonnage} T</td>
                                    <td>${t.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                ${documents.some((d: any) => d.fileData) ? `
                <div class="image-appendix">
                    <div class="section-header">
                        <div class="section-title">${isAr ? 'ملحق المرفقات المصورة' : 'Visual Evidence Appendices'}</div>
                    </div>
                    <div class="image-grid">
                        ${documents.filter((d: any) => d.fileData).map((doc: any) => {
        const isPdf = doc.fileData?.startsWith('data:application/pdf') || doc.fileName?.toLowerCase().endsWith('.pdf');
        return `
                                <div class="img-container">
                                    <div class="img-label">${doc.type} ${doc.number ? `#${doc.number}` : ''}</div>
                                    ${!isPdf
                ? `<img src="${doc.fileData}" class="doc-image" />`
                : `<div class="pdf-placeholder">PDF Attachment (${doc.fileName})<br/>Refer to digital record for full view.</div>`
            }
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>
                ` : ''}

                <footer style="margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <p style="font-size: 10px; color: #94a3b8; font-weight: 500;">
                        Generated by GCM Fleet Intelligence Hub &bull; Confidential Document
                    </p>
                </footer>
                ${globalFooter}
            </div>

            <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
        </body>
    </html>
    `;

    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Prints a Comprehensive Inventory Asset Dossier.
 */
export const printInventoryDossier = (
    item: any,
    activeTab: 'containers' | 'tanks' | 'scales' | 'sizes',
    stats: { tripsCount: number; lastTrip: any | null; history?: any[] },
    isAr: boolean,
    inventorySizes: any[],
    projects: any[],
    companies?: any[],
    templateConfig?: TemplateConfig
): void => {

    const sizeName = inventorySizes.find(s => s.size_id === item.size_id)?.name || 'GENERIC UNIT';
    const lastLocation = stats.lastTrip
        ? (projects.find(p => p.project_id === stats.lastTrip?.project_id)?.project_name || 'N/A')
        : (isAr ? 'في الانتظار' : 'STANDBY');
    const assignedProject = item.project_id
        ? (projects.find((p: any) => p.project_id === item.project_id)?.project_name || 'ACTIVE')
        : (isAr ? 'غير مخصص' : 'UNASSIGNED');
    const issueDate = format(new Date(), 'PPpp');

    const centeredHeader = getCenteredPrintHeader(isAr, templateConfig, isAr ? 'التقرير الفني للأصل' : 'Asset Technical Dossier');
    const globalFooter = getGlobalPrintFooter(isAr, templateConfig);
    const accentColor = templateConfig?.global?.accentColor || '#3b82f6';

    // Safe maintenance logs
    let maintenanceLogs: any[] = [];
    try {
        const raw = item.maintenance_logs;
        maintenanceLogs = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
        if (!Array.isArray(maintenanceLogs)) maintenanceLogs = [];
    } catch { maintenanceLogs = []; }

    // Build deployment history rows
    const history = stats.history || [];
    const deploymentRows = history.slice(0, 15).map((trip: any) => {
        const project = projects.find((p: any) => p.project_id === trip.project_id);
        const company = companies?.find((c: any) => c.company_id === project?.company_id);
        return `
            <tr>
                <td>${trip.trip_id || '---'}</td>
                <td>${trip.date || '---'}</td>
                <td>${project?.project_name || '---'}</td>
                <td>${company?.company_name || '---'}</td>
                <td>${trip.quantity || '---'} ${trip.unit || ''}</td>
                <td style="text-align:center;"><span class="badge ${trip.status === 'COMPLETED' ? 'green' : 'blue'}">${trip.status || '---'}</span></td>
            </tr>
        `;
    }).join('');

    const content = `
    <!DOCTYPE html>
    <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
            <meta charset="UTF-8" />
            <title>Asset Dossier - ${item.code}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif; 
                    margin: 0; padding: 40px; background: #fff; color: #1e293b;
                }
                
                .report-header-box {
                    border-top: 3.5px solid ${accentColor};
                    padding-top: 25px;
                    margin-bottom: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .brand h1 { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
                .brand p { margin: 6px 0 0; color: #64748b; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 2px; }
                .brand .status { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${item.status === 'AVAILABLE' ? '#d1fae5' : '#dbeafe'}; color: ${item.status === 'AVAILABLE' ? '#065f46' : '#1d4ed8'}; border: 1px solid ${item.status === 'AVAILABLE' ? '#6ee7b7' : '#93c5fd'}; }

                .meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: #64748b; }
                
                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
                .kpi { background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; }
                .kpi.accent { border-left: 4.5px solid ${accentColor}; }
                .kpi-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
                .kpi-value { font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1; }

                .section { margin-bottom: 32px; }
                .section-title { font-size: 12px; font-weight: 900; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${accentColor}15; padding-bottom: 10px; margin-bottom: 18px; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                .spec-table tr:nth-child(even) td { background: #f8fafc; }
                .spec-table th, .spec-table td { padding: 12px 16px; text-align: ${isAr ? 'right' : 'left'}; font-size: 12px; border: 1px solid #e2e8f0; }
                .spec-table th { background: #f1f5f9; color: #475569; font-weight: 800; width: 32%; }

                .hist-table thead tr { background: #1e293b; color: #fff; }
                .hist-table th { padding: 12px; text-align: ${isAr ? 'right' : 'left'}; font-weight: 800; font-size: 10px; text-transform: uppercase; }
                .hist-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }

                .badge { padding: 4px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .badge.green { background: #d1fae5; color: #065f46; } .badge.blue { background: #dbeafe; color: #1d4ed8; }

                .maint-item { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                .maint-date { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px; }
                .maint-notes { font-size: 12px; color: #334155; }

                @page { size: auto; margin: 0mm; }
                @media print {
                    body { padding: 0; -webkit-print-color-adjust: exact; margin: 0; }
                    .report-box { padding: 20mm; box-sizing: border-box; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; left:20px; z-index:999;">
                <button onclick="window.print()" style="padding:12px 25px; background:${accentColor}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:900; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    ${isAr ? 'طباعة تقرير الأصل' : 'PRINT ASSET REPORT'}
                </button>
            </div>

            <div class="report-box">
                ${centeredHeader}

                <div class="report-header-box">
                    <div class="brand">
                        <p>${isAr ? 'التقرير الفني للأصل الميداني' : 'FIELD ASSET TECHNICAL REPORT'}</p>
                        <h1>${item.code}</h1>
                        <div style="display:flex; gap:8px; margin-top:12px;">
                            <span class="status">${item.status}</span>
                            ${item.primaryServiceName ? `<span class="status" style="background:#4f46e515; color:#4f46e5; border:1px solid #4f46e530;">${item.primaryServiceName}</span>` : ''}
                        </div>
                    </div>
                    <div class="meta">
                        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Generated On</div>
                        <div style="font-size: 13px; font-weight: 900; color: #1e293b;">${new Date().toLocaleDateString('en-GB')}</div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 4px;">Ref Code: ${item.code}</div>
                    </div>
                </div>

        <div class="section-title" > ${isAr ? 'سجل الصيانة والاعتمادية' : 'Maintenance & Reliability Ledger'} </div>
                ${maintenanceLogs.length > 0 ? maintenanceLogs.map((log: any) => `
                    <div class="maint-item">
                        <div class="maint-date">${log.date || '---'}</div>
                        <div class="maint-notes">${log.notes || '---'}</div>
                    </div>
                `).join('') : `<div class="empty">${isAr ? 'لا توجد سجلات صيانة مسجلة.' : 'No maintenance records found.'}</div>`
        }
</div>

    < footer >
    <span>GCM Inventory Intelligence & bull; Asset #${item.code} </span>
        < span > ${issueDate} </span>
            </footer>
            ${globalFooter}

<script>window.onload = () => { setTimeout(() => window.print(), 800); }; </script>
    </body>
    </html>
        `;

    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const printDriverDossier = (
    driver: any,
    stats: { tripsCount: number; tonnage: number; history?: any[] },
    isAr: boolean,
    projects: any[],
    companies?: any[],
    templateConfig?: TemplateConfig
): void => {
    const issueDate = formatDate(new Date().toISOString(), 'MMM dd, yyyy HH:mm', isAr);
    const centeredHeader = getCenteredPrintHeader(isAr, templateConfig, isAr ? 'التقرير الفني للسائق' : 'Personnel Technical Dossier');
    const globalFooter = getGlobalPrintFooter(isAr, templateConfig);
    const accentColor = templateConfig?.global?.accentColor || '#3b82f6';

    // Safety check and parse permits
    let permits: any[] = [];
    try {
        permits = JSON.parse(driver.permit_zones || '[]');
    } catch { permits = []; }

    // Build history rows
    const history = stats.history || [];
    const recentHistory = history.slice(0, 15);
    const historyRows = recentHistory.map((trip: any) => {
        const project = projects.find((p: any) => p.project_id === trip.project_id);
        const company = companies?.find((c: any) => c.company_id === project?.company_id);
        return `
            <tr>
                <td>${trip.trip_id || '---'}</td>
                <td>${formatDate(trip.date)} ${trip.time || ''}</td>
                <td>${project?.project_name || '---'}</td>
                <td>${company?.company_name || '---'}</td>
                <td style="font-weight:700;">${trip.quantity || '---'} ${trip.unit || ''}</td>
                <td style="text-align:center;"><span class="badge ${trip.status === 'COMPLETED' ? 'green' : 'blue'}">${trip.status || '---'}</span></td>
            </tr>
        `;
    }).join('');

    const permitCards = permits.length > 0
        ? permits.map((p: any) => `
            <div class="permit-card">
                <div class="permit-title">${p.no || 'PERMIT'}</div>
                <div class="permit-zone">${p.zone || 'Global Zone'}</div>
            </div>
        `).join('')
        : `<div class="empty">${isAr ? 'لا توجد تصاريح' : 'No active permits'}</div>`;

    const avatarSymbol = driver.category === 'MANAGEMENT' ? 'B' : 'H';

    // Calculate Document Readiness
    const requiredDocsKeys = ['iqama_no', 'license_no', 'operating_card_no', 'insurance_no'];
    const completedDocsCount = requiredDocsKeys.filter(key => !!driver[key]).length;
    const readinessScore = (completedDocsCount / 4) * 100;

    const content = `
        <!DOCTYPE html>
        <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
            <meta charset="UTF-8" />
            <title>Driver Dossier - ${driver.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif; 
                    margin: 0; padding: 40px; background: #fff; color: #1e293b;
                }
                
                .report-header-box {
                    border-top: 3.5px solid ${accentColor};
                    padding-top: 25px;
                    margin-bottom: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .brand { display: flex; gap: 20px; align-items: center; }
                .brand-icon { width: 64px; height: 64px; border-radius: 18px; background: #1e293b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; }
                .brand-text h1 { margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; }
                .brand-text p { margin: 4px 0 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
                .brand-text .status { display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${driver.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2'}; color: ${driver.status === 'ACTIVE' ? '#065f46' : '#991b1b'}; border: 1px solid ${driver.status === 'ACTIVE' ? '#6ee7b7' : '#fca5a5'}; }

                .meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: #64748b; }
                
                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
                .kpi { background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; }
                .kpi.accent { border-left: 4.5px solid ${accentColor}; }
                .kpi-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
                .kpi-value { font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1; }

                .section { margin-bottom: 32px; }
                .section-title { font-size: 12px; font-weight: 900; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${accentColor}15; padding-bottom: 10px; margin-bottom: 18px; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                .spec-table tr:nth-child(even) td { background: #f8fafc; }
                .spec-table th, .spec-table td { padding: 12px 16px; text-align: ${isAr ? 'right' : 'left'}; font-size: 12px; border: 1px solid #e2e8f0; }
                .spec-table th { background: #f1f5f9; color: #475569; font-weight: 800; width: 32%; }

                .hist-table thead tr { background: #1e293b; color: #fff; }
                .hist-table th { padding: 12px; text-align: ${isAr ? 'right' : 'left'}; font-weight: 800; font-size: 10px; text-transform: uppercase; }
                .hist-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }

                .badge { padding: 4px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .badge.green { background: #d1fae5; color: #065f46; } .badge.blue { background: #dbeafe; color: #1d4ed8; }
                
                .permit-grid { display: flex; flex-wrap: wrap; gap: 12px; }
                .permit-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; min-width: 180px; border-left: 4.5px solid #10b981; }
                .permit-title { font-size: 12px; font-weight: 800; color: #0f172a; }
                .permit-zone { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px; }

                @page { size: auto; margin: 0mm; }
                @media print {
                    body { padding: 0; -webkit-print-color-adjust: exact; margin: 0; }
                    .report-box { padding: 20mm; box-sizing: border-box; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:9999;">
                <button onclick="window.print()" style="padding:12px 25px; background:${accentColor}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:900; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    ${isAr ? 'طباعة تقرير السائق' : 'PRINT PERSONNEL DOSSIER'}
                </button>
            </div>

            <div class="report-box">
                ${centeredHeader}

                <div class="report-header-box">
                    <div class="brand">
                        <div class="brand-icon">${avatarSymbol}</div>
                        <div class="brand-text">
                            <h1>${driver.name}</h1>
                            <p>${driver.driver_id} &bull; ${driver.ownership_type === 'SUPPLIER' ? (driver.supplier_name || 'External') : 'Internal Fleet'}</p>
                            <div class="status">${driver.status}</div>
                        </div>
                    </div>
                    <div class="meta">
                        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Technical Dossier</div>
                        <div style="font-size: 13px; font-weight: 900; color: #1e293b;">Ref: #${driver.driver_id.toString().slice(-6).toUpperCase()}</div>
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 4px;">${issueDate}</div>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi blue accent"><div class="kpi-title">${isAr ? 'إجمالي الرحلات' : 'Total Trips'}</div><div class="kpi-value">${stats.tripsCount}</div></div>
                    <div class="kpi green accent"><div class="kpi-title">${isAr ? 'إجمالي الحمولات' : 'Total Tonnage'}</div><div class="kpi-value">${stats.tonnage.toFixed(1)} T</div></div>
                    <div class="kpi orange accent"><div class="kpi-title">${isAr ? 'نسبة الجاهزية' : 'Readiness Score'}</div><div class="kpi-value">${readinessScore.toFixed(0)}%</div></div>
                    <div class="kpi purple accent"><div class="kpi-title">${isAr ? 'التصاريح النشطة' : 'Active Permits'}</div><div class="kpi-value">${permits.length}</div></div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'سجل الامتثال والوثائق الإلزامية' : 'Compliance & Document Registry'}</div>
                    <table class="spec-table">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="width:25%;">${isAr ? 'نوع المستند' : 'Document Type'}</th>
                                <th style="width:25%;">${isAr ? 'رقم المستند' : 'Document Number'}</th>
                                <th style="width:25%;">${isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                                <th style="width:25%;">${isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>${isAr ? 'رقم الإقامة' : 'Iqama Registry'}</strong></td>
                                <td>${driver.iqama_no || '---'}</td>
                                <td>${driver.iqama_expiry || '---'}</td>
                                <td><span class="badge ${driver.iqama_no ? 'green' : 'blue'}">${driver.iqama_no ? (isAr ? 'مكتمل' : 'UPLOADED') : (isAr ? 'مفقود' : 'MISSING')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>${isAr ? 'رخصة القيادة' : 'Driver License'}</strong></td>
                                <td>${driver.license_no || '---'}</td>
                                <td>${driver.license_expiry || '---'}</td>
                                <td><span class="badge ${driver.license_no ? 'green' : 'blue'}">${driver.license_no ? (isAr ? 'مكتمل' : 'UPLOADED') : (isAr ? 'مفقود' : 'MISSING')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>${isAr ? 'كارت التشغيل' : 'Operating Card'}</strong></td>
                                <td>${driver.operating_card_no || '---'}</td>
                                <td>${driver.operating_card_expiry || '---'}</td>
                                <td><span class="badge ${driver.operating_card_no ? 'green' : 'blue'}">${driver.operating_card_no ? (isAr ? 'مكتمل' : 'UPLOADED') : (isAr ? 'مفقود' : 'MISSING')}</span></td>
                            </tr>
                            <tr>
                                <td><strong>${isAr ? 'وثيقة التأمين' : 'Insurance Policy'}</strong></td>
                                <td>${driver.insurance_no || '---'}</td>
                                <td>${driver.insurance_expiry || '---'}</td>
                                <td><span class="badge ${driver.insurance_no ? 'green' : 'blue'}">${driver.insurance_no ? (isAr ? 'مكتمل' : 'UPLOADED') : (isAr ? 'مفقود' : 'MISSING')}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <table class="spec-table">
                        <tr><th>${isAr ? 'الرقم التعريفي' : 'Driver ID'}</th><td>${driver.driver_id}</td></tr>
                        <tr><th>${isAr ? 'المسمى الوظيفي' : 'Role Title'}</th><td>${driver.role_title || (driver.category === 'OPERATIONS' ? 'Driver' : 'Admin')}</td></tr>
                        <tr><th>${isAr ? 'الفئة' : 'Category'}</th><td>${driver.category}</td></tr>
                        <tr><th>${isAr ? 'تأكيد الحضور' : 'Status'}</th><td><strong style="color:${driver.status === 'ACTIVE' ? '#10b981' : '#ef4444'}">${driver.status}</strong></td></tr>
                        <tr><th>${isAr ? 'رقم الهاتف' : 'Contact Phone'}</th><td style="font-family:monospace; font-size:14px;">${driver.phone}</td></tr>
                        <tr><th>${isAr ? 'نوع الملكية' : 'Ownership Type'}</th><td>${driver.ownership_type}${driver.supplier_name ? ` (${driver.supplier_name})` : ''}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'سجل التصاريح النشطة' : 'Active Access Permits'}</div>
                    <div class="permit-grid">
                        ${permitCards}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'السجل الزمني للعمليات' : 'Operational Deployment History'}</div>
                    ${historyRows.length > 0 ? `
                        <table class="hist-table">
                            <thead><tr>
                                <th>${isAr ? 'رقم الرحلة' : 'Trip ID'}</th>
                                <th>${isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                                <th>${isAr ? 'المشروع' : 'Project'}</th>
                                <th>${isAr ? 'الشركة' : 'Company'}</th>
                                <th>${isAr ? 'الكمية' : 'Qty'}</th>
                                <th style="text-align:center;">${isAr ? 'الحالة' : 'Status'}</th>
                            </tr></thead>
                            <tbody>${historyRows}</tbody>
                        </table>
                        ${history.length > 15 ? `<p style="font-size:11px;color:#64748b;text-align:center;margin-top:10px;">${isAr ? `... و ${history.length - 15} رحلة أخرى` : `... and ${history.length - 15} more trips`}</p>` : ''}
                    ` : `<div class="empty">${isAr ? 'لم يُسجل أي نشاط ميداني لهذا السائق بعد.' : 'No field deployments recorded yet.'}</div>`}
                </div>

                ${globalFooter}
            </div>
            <script>window.onload = () => { setTimeout(() => window.print(), 800); };</script>
        </body>
        </html>
    `;

    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Prints a Comprehensive Subcontractor / Supplier Dossier.
 */
export const printSubcontractorDossier = (
    supplier: Supplier,
    stats: {
        vehicles: any[];
        containers: any[];
        tanks: any[];
        staff: any[];
        staffCount: number;
    },
    isAr: boolean,
    projects: Project[],
    services: Service[],
    templateConfig?: TemplateConfig
): void => {
    const issueDate = formatDate(new Date().toISOString(), 'MMM dd, yyyy HH:mm', isAr);
    const centeredHeader = getCenteredPrintHeader(isAr, templateConfig, isAr ? 'المواصفات الفنية للشريك (المقاول)' : 'Subcontractor Technical Dossier');
    const globalFooter = getGlobalPrintFooter(isAr, templateConfig);
    const accentColor = templateConfig?.global?.accentColor || '#f59e0b';

    let assignedProjectIds: any[] = [];
    try {
        assignedProjectIds = typeof supplier.assigned_projects === 'string' ? JSON.parse(supplier.assigned_projects) : (supplier.assigned_projects || []);
    } catch { assignedProjectIds = []; }
    const assignedProjectNames = projects.filter(p => assignedProjectIds.includes(p.project_id)).map(p => p.project_name);

    let assignedServiceIds: any[] = [];
    try {
        assignedServiceIds = typeof supplier.assigned_services === 'string' ? JSON.parse(supplier.assigned_services) : (supplier.assigned_services || []);
    } catch { assignedServiceIds = []; }
    const assignedServiceNames = services.filter(s => assignedServiceIds.includes(s.service_id)).map(s => s.service_name);

    const content = `
        <!DOCTYPE html>
        <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
            <meta charset="UTF-8" />
            <title>Supplier Dossier - ${supplier.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
                
                body { 
                    font-family: ${isAr ? "'Cairo'" : "'Inter'"}, sans-serif; 
                    margin: 0; padding: 40px; background: #fff; color: #1e293b;
                }
                
                .report-header-box {
                    border-top: 3.5px solid ${accentColor};
                    padding-top: 25px;
                    margin-bottom: 35px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .brand h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
                .brand p { margin: 6px 0 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }

                .meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: #64748b; }
                
                .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
                .kpi { background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; border-left: 4.5px solid ${accentColor}; }
                .kpi-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
                .kpi-value { font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1; }

                .section { margin-bottom: 32px; page-break-inside: avoid; }
                .section-title { font-size: 12px; font-weight: 900; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${accentColor}15; padding-bottom: 10px; margin-bottom: 18px; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
                th, td { padding: 12px 14px; text-align: ${isAr ? 'right' : 'left'}; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
                th { background: #f8fafc; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 9px; }
                
                .badge { padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: #f1f5f9; color: #475569; }
                .badge.success { background: #d1fae5; color: #065f46; }

                .contract-timeline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; background: #fffbeb; padding: 20px; border-radius: 14px; border: 1px solid #fef3c7; }
                .timeline-item h4 { margin: 0 0 5px 0; font-size: 9px; color: #92400e; text-transform: uppercase; font-weight: 800; }
                .timeline-item p { margin: 0; font-size: 14px; font-weight: 900; color: #0f172a; }

                .tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
                .tag { background: #f8fafc; padding: 5px 12px; border-radius: 8px; font-size: 10px; font-weight: 800; color: #475569; border: 1px solid #e2e8f0; }

                @page { size: auto; margin: 0mm; }
                @media print {
                    body { padding: 0; -webkit-print-color-adjust: exact; margin: 0; }
                    .report-box { padding: 20mm; box-sizing: border-box; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:9999;">
                <button onclick="window.print()" style="padding:12px 25px; background:${accentColor}; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:900; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    ${isAr ? 'طباعة ملف المقاول' : 'PRINT SUPPLIER DOSSIER'}
                </button>
            </div>

            <div class="report-box">
                ${centeredHeader}

                <div class="report-header-box">
                    <div class="brand">
                        <p>${isAr ? 'بيانات الشريك الاستراتيجي' : 'STRATEGIC PARTNER DATA'}</p>
                        <h1>${supplier.name}</h1>
                        <p>${supplier.category} &bull; ${supplier.supplier_id}</p>
                    </div>
                    <div class="meta">
                        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Technical Dossier</div>
                        <div style="font-size: 13px; font-weight: 900; color: #1e293b;">Ref: #${supplier.supplier_id.toString().slice(-6).toUpperCase()}</div>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi">
                        <div class="kpi-title">${isAr ? 'قوة الأسطول' : 'Total Fleet'}</div>
                        <div class="kpi-value">${stats.vehicles.length} Units</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-title">${isAr ? 'الأصول الميدانية' : 'Field Assets'}</div>
                        <div class="kpi-value">${stats.containers.length + stats.tanks.length} Units</div>
                    </div>
                    <div class="kpi">
                        <div class="kpi-title">${isAr ? 'إجمالي القوى البشرية' : 'Headcount'}</div>
                        <div class="kpi-value">${stats.staffCount} Staff</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'الحوكمة والجدولة الزمنية للعقد' : 'Contract Governance & Timeline'}</div>
                    <div class="contract-timeline">
                        <div class="timeline-item">
                            <h4>${isAr ? 'تاريخ تفعيل العقد' : 'Activation Date'}</h4>
                            <p>${supplier.contract_start || '---'}</p>
                        </div>
                        <div class="timeline-item">
                            <h4>${isAr ? 'تاريخ انتهاء العقد' : 'Termination Date'}</h4>
                            <p>${supplier.contract_end || '---'}</p>
                        </div>
                        <div class="timeline-item">
                            <h4>${isAr ? 'بدء العمليات' : 'Operation Start'}</h4>
                            <p>${supplier.work_start_date || '---'}</p>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'التخصيص الاستراتيجي' : 'Strategic Assignments'}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div>
                            <h4 style="font-size: 10px; color: #64748b; margin-bottom: 10px; text-transform: uppercase;">${isAr ? 'المشاريع النشطة' : 'Active Projects'}</h4>
                            <div class="tag-cloud">
                                ${assignedProjectNames.length > 0 ? assignedProjectNames.map(n => `<span class="tag">${n}</span>`).join('') : `<span style="font-size: 11px; color: #94a3b8; font-style: italic;">${isAr ? 'لم يتم التعيين' : 'None assigned'}</span>`}
                            </div>
                        </div>
                        <div>
                            <h4 style="font-size: 10px; color: #64748b; margin-bottom: 10px; text-transform: uppercase;">${isAr ? 'الخدمات المعتمدة' : 'Certified Services'}</h4>
                            <div class="tag-cloud">
                                ${assignedServiceNames.length > 0 ? assignedServiceNames.map(n => `<span class="tag">${n}</span>`).join('') : `<span style="font-size: 11px; color: #94a3b8; font-style: italic;">${isAr ? 'لم يتم التعيين' : 'None assigned'}</span>`}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'سجل الأسطول التشغيلي' : 'Operational Fleet Registry'}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'رقم اللوحة' : 'Plate No'}</th>
                                <th>${isAr ? 'النوع' : 'Type'}</th>
                                <th>${isAr ? 'الموديل' : 'Model'}</th>
                                <th>${isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.vehicles.slice(0, 20).map(v => `
                                <tr>
                                    <td><strong>${v.plate_no}</strong></td>
                                    <td>${v.vehicle_type}</td>
                                    <td>${v.model || '---'}</td>
                                    <td><span class="badge ${v.status === 'ACTIVE' ? 'success' : ''}">${v.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${stats.vehicles.length > 20 ? `<p style="font-size: 10px; text-align: center; color: #94a3b8; margin-top: 10px;">+ ${stats.vehicles.length - 20} ${isAr ? 'مركبة إضافية في السجلات' : 'more units in digital record'}</p>` : ''}
                </div>

                <div class="section">
                    <div class="section-title">${isAr ? 'سجل الموظفين والامتثال' : 'Personnel & Compliance Registry'}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>${isAr ? 'الاسم' : 'Name'}</th>
                                <th>${isAr ? 'المهنة' : 'Role'}</th>
                                <th>${isAr ? 'رقم الهوية' : 'ID / Iqama'}</th>
                                <th>${isAr ? 'الحالة' : 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.staff.slice(0, 20).map(s => `
                                <tr>
                                    <td><strong>${s.name}</strong></td>
                                    <td>${s.role_title || 'Operator'}</td>
                                    <td>${s.iqama_no || '---'}</td>
                                    <td><span class="badge ${s.status === 'ACTIVE' ? 'success' : ''}">${s.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${globalFooter}
            </div>
            <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
        </body>
        </html>
    `;

    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

