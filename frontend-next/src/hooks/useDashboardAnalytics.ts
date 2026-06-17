import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/api/client";

export type DashboardAnalyticsSeriesPoint = {
  date: string;
  value: number;
  trips?: number;
};

export type DashboardAnalyticsTopProject = {
  projectId: string;
  projectName: string;
  volume: number;
  revenue: number;
  tripCount: number;
};

export type DashboardAnalyticsPayload = {
  generatedAt: string;
  revenueTrend: {
    totalRevenue: number;
    totalTrips: number;
    series: DashboardAnalyticsSeriesPoint[];
  };
  operationsTrend: {
    totalVolume: number;
    totalTrips: number;
    series: DashboardAnalyticsSeriesPoint[];
  };
  topProjects: DashboardAnalyticsTopProject[];
};

type DashboardAnalyticsState = {
  data: DashboardAnalyticsPayload | null;
  loading: boolean;
  error: string | null;
};

const dashboardClient = createApiClient();

const emptyState: DashboardAnalyticsState = {
  data: null,
  loading: true,
  error: null,
};

const normalizeDashboardAnalytics = (payload: unknown): DashboardAnalyticsPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const typed = payload as Partial<DashboardAnalyticsPayload>;
  if (!typed.revenueTrend || !typed.operationsTrend) {
    return null;
  }

  return {
    generatedAt: typeof typed.generatedAt === "string" ? typed.generatedAt : new Date().toISOString(),
    revenueTrend: {
      totalRevenue: Number(typed.revenueTrend.totalRevenue || 0),
      totalTrips: Number(typed.revenueTrend.totalTrips || 0),
      series: Array.isArray(typed.revenueTrend.series) ? typed.revenueTrend.series.map((point) => ({
        date: String(point?.date || ""),
        value: Number(point?.value || 0),
        trips: Number(point?.trips || 0),
      })) : [],
    },
    operationsTrend: {
      totalVolume: Number(typed.operationsTrend.totalVolume || 0),
      totalTrips: Number(typed.operationsTrend.totalTrips || 0),
      series: Array.isArray(typed.operationsTrend.series) ? typed.operationsTrend.series.map((point) => ({
        date: String(point?.date || ""),
        value: Number(point?.value || 0),
        trips: Number(point?.trips || 0),
      })) : [],
    },
    topProjects: Array.isArray(typed.topProjects) ? typed.topProjects.map((project) => ({
      projectId: String(project?.projectId || ""),
      projectName: String(project?.projectName || project?.projectId || ""),
      volume: Number(project?.volume || 0),
      revenue: Number(project?.revenue || 0),
      tripCount: Number(project?.tripCount || 0),
    })) : [],
  };
};

export const useDashboardAnalytics = (): DashboardAnalyticsState => {
  const [state, setState] = useState<DashboardAnalyticsState>(emptyState);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await dashboardClient.getDashboardStats();
        if (!active) {
          return;
        }

        const normalized = normalizeDashboardAnalytics(payload);
        setState({
          data: normalized,
          loading: false,
          error: normalized ? null : "Unexpected dashboard analytics payload",
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load dashboard analytics",
        });
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => state, [state]);
};