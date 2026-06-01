/**
 * [AR] خطاف خرائط البحث السريع — يحول المصفوفات إلى Record<id, entity>
 * [EN] Lookup Maps Hook — Converts arrays to O(1) lookup dictionaries
 *
 * Eliminates O(n) .find() calls in render loops.
 * Instead of: projects.find(p => p.project_id === trip.project_id)
 * Use:        projectMap[trip.project_id]
 *
 * Usage:
 *   const { projectMap, companyMap, driverMap, vehicleMap, serviceMap } = useLookupMaps();
 */
import { useMemo } from 'react';
import { useGCMStore } from '@/store';
import type { Company, Project, Service, Vehicle, Driver, Supplier, Facility, Container, Tank } from '@/types';

type LookupMap<T> = Record<string, T>;

function buildMap<T>(items: T[], keyFn: (item: T) => string): LookupMap<T> {
  const map: LookupMap<T> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key) map[key] = item;
  }
  return map;
}

export function useLookupMaps() {
  const companies = useGCMStore(s => s.companies);
  const allProjects = useGCMStore(s => s.allProjects);
  const services = useGCMStore(s => s.services);
  const vehicles = useGCMStore(s => s.vehicles);
  const drivers = useGCMStore(s => s.drivers);
  const suppliers = useGCMStore(s => s.suppliers);
  const facilities = useGCMStore(s => s.facilities);
  const containers = useGCMStore(s => s.containers);
  const tanks = useGCMStore(s => s.tanks);

  const companyMap = useMemo(() => buildMap(companies, c => c.company_id), [companies]);
  const projectMap = useMemo(() => buildMap(allProjects, p => p.project_id), [allProjects]);
  const serviceMap = useMemo(() => buildMap(services, s => s.service_id), [services]);
  const vehicleMap = useMemo(() => buildMap(vehicles, v => v.vehicle_id), [vehicles]);
  const driverMap = useMemo(() => buildMap(drivers, d => d.driver_id), [drivers]);
  const supplierMap = useMemo(() => buildMap(suppliers, s => s.supplier_id), [suppliers]);
  const facilityMap = useMemo(() => buildMap(facilities, f => f.facility_id), [facilities]);
  const containerMap = useMemo(() => buildMap(containers, c => c.container_id), [containers]);
  const tankMap = useMemo(() => buildMap(tanks, t => t.tank_id), [tanks]);

  return {
    companyMap,
    projectMap,
    serviceMap,
    vehicleMap,
    driverMap,
    supplierMap,
    facilityMap,
    containerMap,
    tankMap,
  };
}

/** Standalone map builder for use outside components */
export { buildMap };

export default useLookupMaps;
