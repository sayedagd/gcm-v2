import { useCallback, useMemo } from 'react';
import { Project, ProjectService, Trip } from '@/types';

type CompanyMap = Record<string, { company_name?: string }>;

interface UseProjectsPageMetricsArgs {
  projects: Project[];
  projectServices: ProjectService[];
  trips: Trip[];
  companyMap: CompanyMap;
  debouncedSearch: string;
  currentPage: number;
  pageSize: number;
}

export const useProjectsPageMetrics = ({
  projects,
  projectServices,
  trips,
  companyMap,
  debouncedSearch,
  currentPage,
  pageSize,
}: UseProjectsPageMetricsArgs) => {
  const filteredProjects = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return projects;
    return projects.filter(project =>
      (project.project_name || '').toLowerCase().includes(q) ||
      (companyMap[project.company_id]?.company_name || '').toLowerCase().includes(q)
    );
  }, [projects, companyMap, debouncedSearch]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;

  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredProjects, currentPage, indexOfFirstItem, indexOfLastItem]);

  const budgetProgressMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(project => {
      map[project.project_id] = 0;
    });
    return map;
  }, [projects]);

  const quantityProgressMap = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(project => {
      let target = Number(project.total_quantities) || 0;
      if (target <= 0) {
        const projectServicesForProject = projectServices.filter(service => service.project_id === project.project_id);
        target = projectServicesForProject.reduce((sum, service) => sum + (Number(service.quantity) || 0), 0);
      }

      if (target <= 0) {
        map[project.project_id] = 0;
        return;
      }

      const projectTrips = trips.filter(trip => trip.project_id === project.project_id);
      const actual = projectTrips.reduce((sum, trip) => sum + (Number(trip.quantity) || 0), 0);
      const progress = Math.round((actual / target) * 100);
      map[project.project_id] = progress > 100 ? 100 : progress;
    });
    return map;
  }, [projects, trips, projectServices]);

  const calculateBudgetProgress = useCallback((projectId: string) => budgetProgressMap[projectId] || 0, [budgetProgressMap]);
  const calculateQuantityProgress = useCallback((projectId: string) => quantityProgressMap[projectId] || 0, [quantityProgressMap]);

  const projectStats = useMemo(() => {
    let endedDueToDuration = 0;
    let endedDueToQuantity = 0;
    let approachingLimit = 0;
    let totalActiveServices = 0;

    const now = new Date();

    projects.forEach(project => {
      if (project.end_date && new Date(project.end_date) < now) {
        endedDueToDuration++;
      }

      if (calculateQuantityProgress(project.project_id) >= 100) {
        endedDueToQuantity++;
      }

      const projectServicesForProject = projectServices.filter(service => service.project_id === project.project_id);
      let isApproaching = false;

      projectServicesForProject.forEach(service => {
        if (project.status === 'ACTIVE') totalActiveServices++;

        const serviceTrips = trips.filter(trip => trip.project_id === project.project_id && trip.service_id === service.service_id);
        const serviceActual = serviceTrips.reduce((sum, trip) => sum + (Number(trip.quantity) || 0), 0);
        const warningThreshold = Number(service.warning_threshold) || 0;
        const serviceTarget = Number(service.quantity) || 0;

        if (warningThreshold > 0 && serviceActual >= warningThreshold && serviceActual < serviceTarget) {
          isApproaching = true;
        }
      });

      if (isApproaching) {
        approachingLimit++;
      }
    });

    return {
      total: projects.length,
      active: projects.filter(project => project.status === 'ACTIVE').length,
      endedDueToDuration,
      endedDueToQuantity,
      approachingLimit,
      totalActiveServices,
    };
  }, [projects, projectServices, trips, calculateQuantityProgress]);

  return {
    filteredProjects,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    paginatedProjects,
    budgetProgressMap,
    quantityProgressMap,
    calculateBudgetProgress,
    calculateQuantityProgress,
    projectStats,
  };
};
