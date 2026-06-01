import { fetchApiJson } from "@/lib/serverFetch";
import { API_ENDPOINTS } from "@/features/core/model/endpoints";

export type SystemConfigResponse = {
  [key: string]: unknown;
};

export async function getSystemConfig(options?: { revalidateSeconds?: number }) {
  return fetchApiJson<SystemConfigResponse>(API_ENDPOINTS.system.config, {
    strategy: "revalidate",
    revalidateSeconds: options?.revalidateSeconds || 600,
  });
}
