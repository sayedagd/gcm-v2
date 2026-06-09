import { createApiClient } from '@/api/client';
import type { paths } from '@/api/generated/openapi.types';

export type LoginRequest = paths['/api/v1/auth/login']['post']['requestBody']['content']['application/json'];
export type LoginResponse = paths['/api/v1/auth/login']['post']['responses'][200]['content']['application/json'];
export type CompaniesResponse = paths['/api/v1/companies']['get']['responses'][200]['content']['application/json'];
export type ConfigResponse = paths['/api/v1/config']['get']['responses'][200]['content']['application/json'];

export const createTypedApiSdk = (baseUrl = '') => {
  const client = createApiClient(baseUrl);

  return {
    login: (payload: LoginRequest): Promise<LoginResponse> => client.login(payload) as Promise<LoginResponse>,
    getCompanies: (): Promise<CompaniesResponse> => client.getCompanies() as Promise<CompaniesResponse>,
    getConfig: (): Promise<ConfigResponse> => client.getConfig() as Promise<ConfigResponse>,
  };
};
