import { useMemo } from 'react';
import { useStore } from '@/context';
import { Trip, Project, Role, Service } from '@/types';

export const useClientScope = () => {
    const { currentUser, trips, projects, services } = useStore();

    // 1. Projects In Scope
    const scopedProjects = useMemo(() => {
        if ([Role.ADMIN, Role.REPORTS_MANAGER, Role.LOGISTICS].includes(currentUser.role as Role)) {
            return projects;
        }
        if ((currentUser.role === Role.COMPANY_USER || currentUser.role === Role.CLIENT) && currentUser.company_id) {
            return projects.filter(p => p.company_id === currentUser.company_id);
        }
        if (currentUser.role === Role.PROJECT_USER && currentUser.project_id) {
            return projects.filter(p => p.project_id === currentUser.project_id);
        }
        return [];
    }, [projects, currentUser]);

    const scopedProjectIds = useMemo(() => scopedProjects.map(p => p.project_id), [scopedProjects]);

    // 2. Trips In Scope
    const scopedTrips = useMemo(() => {
        // The global store ALREADY securely filters trips by user role (company_id or project_id).
        // By NOT filtering against scopedProjectIds here, we ensure that clients can still see 
        // trips for projects that have been archived or deleted from the active projects list.
        return trips;
    }, [trips]);

    // 3. Services In Scope (unique services from scoped trips)
    const scopedServices = useMemo(() => {
        const usedServiceIds = new Set(scopedTrips.map(t => t.service_id));
        return services.filter(s => usedServiceIds.has(s.service_id));
    }, [scopedTrips, services]);

    return {
        scopedProjects,
        scopedProjectIds,
        scopedTrips,
        scopedServices
    };
};
