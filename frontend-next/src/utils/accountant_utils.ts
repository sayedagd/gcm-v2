import { Trip, Project, Company, Service } from '../types';
// import { normalizeToTons } from './helpers'; // Removed

/**
 * [AR] تحويل الكمية إلى طن
 * [EN] Normalize quantity to Tons
 */
const normalizeToTons = (qty: number, unit: string = 'TON'): number => {
    if (!qty) return 0;
    const u = unit.toUpperCase();
    if (u === 'KG' || u === 'KILOGRAM') return qty / 1000;
    if (u === 'G' || u === 'GRAM') return qty / 1000000;
    return qty;
};

/**
 * [AR] حساب الإحصائيات المالية والتشغيلية للمركز المالي
 * [EN] Calculate financial and operational stats for the Accountant Portal
 */
export const calculateAccountantStats = (
    trips: Trip[],
    projects: Project[],
    companies: Company[],
    services: Service[],
    filters: {
        searchTerm: string;
        dateRange: { start: string; end: string };
        selectedStatus: string;
        selectedService: string;
    }
) => {
    const { searchTerm, dateRange, selectedStatus, selectedService } = filters;
    const data: any = {};
    const DEFAULT_UNIT_PRICE = 100; // SAR per ton

    // Initialize company buckets
    companies.forEach(comp => {
        data[comp.company_id] = {
            info: comp,
            totalQty: 0,
            totalTrips: 0,
            totalSpent: 0,
            projects: {}
        };
    });

    // Create a bucket for unknown company
    const UNKNOWN_COMPANY_ID = 'UNKNOWN_COMPANY';
    const unknownCompanyBucket = {
        info: {
            company_id: UNKNOWN_COMPANY_ID,
            company_name: 'Unknown Company',
            commercial_reg: 'N/A',
            logo_url: null
        },
        totalQty: 0,
        totalTrips: 0,
        totalSpent: 0,
        projects: {}
    };

    trips.forEach(trip => {
        // --- Apply Filters ---
        if (dateRange.start && trip.date < dateRange.start) return;
        if (dateRange.end && trip.date > dateRange.end) return;
        if (selectedStatus !== 'ALL' && trip.status !== selectedStatus) return;
        if (selectedService !== 'ALL' && trip.service_id !== selectedService) return;

        let project = projects.find(p => p.project_id === trip.project_id);
        let compId = project ? project.company_id : UNKNOWN_COMPANY_ID;

        // If project found but company not in data (rare), fallback to unknown
        if (project && !data[compId]) {
            compId = UNKNOWN_COMPANY_ID;
        }

        // If using unknown bucket, ensure it's in data
        if (compId === UNKNOWN_COMPANY_ID) {
            if (!data[UNKNOWN_COMPANY_ID]) {
                data[UNKNOWN_COMPANY_ID] = unknownCompanyBucket;
            }
            if (!project) {
                project = {
                    project_id: trip.project_id || 'UNKNOWN_PROJECT',
                    project_name: `Project (${trip.project_id || 'Unknown'})`,
                    budget: 0,
                    company_id: UNKNOWN_COMPANY_ID
                } as any;
            }
        }

        // Ensure project bucket exists
        if (!data[compId].projects[trip.project_id || 'UNKNOWN_PROJECT']) {
            data[compId].projects[trip.project_id || 'UNKNOWN_PROJECT'] = {
                info: project,
                totalQty: 0,
                totalTrips: 0,
                spent: 0,
                services: {}
            };
        }

        const projRef = data[compId].projects[trip.project_id || 'UNKNOWN_PROJECT'];

        // Ensure service bucket exists
        const serviceId = trip.service_id || 'UNKNOWN_SERVICE';
        if (!projRef.services[serviceId]) {
            const service = services.find(s => s.service_id === serviceId) || {
                service_id: serviceId,
                service_name: `Service (${serviceId})`,
                service_description: 'N/A',
                parent_id: null
            };
            projRef.services[serviceId] = {
                info: service,
                qty: 0,
                trips: 0,
                cost: 0,
                unit: trip.unit || 'TON'
            };
        }

        const qty = parseFloat(Boolean(trip.quantity) ? String(trip.quantity) : "0") || 0;
        const normalizedQty = normalizeToTons(qty, trip.unit);
        const tripCost = normalizedQty * DEFAULT_UNIT_PRICE;

        // Accumulate stats
        const svc = projRef.services[serviceId];
        svc.qty += qty;
        svc.trips += 1;
        svc.cost += tripCost;

        projRef.totalQty += qty;
        projRef.totalTrips += 1;
        projRef.spent += tripCost;

        data[compId].totalQty += qty;
        data[compId].totalTrips += 1;
        data[compId].totalSpent += tripCost;
    });

    // Final filtering by search term (Company Name or Project Name)
    const term = searchTerm.toLowerCase();
    const result = Object.values(data).filter((c: any) => {
        if (c.totalTrips === 0) return false;
        if (!term) return true;

        const matchCompany = c.info.company_name?.toLowerCase().includes(term);
        const matchProject = Object.values(c.projects).some((p: any) =>
            p.info.project_name?.toLowerCase().includes(term)
        );

        return matchCompany || matchProject;
    });

    return result;
};
