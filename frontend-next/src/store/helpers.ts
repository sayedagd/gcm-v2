import { ApiError } from '@/api/client';
import { EntityType } from '@/types';

export const getBilingualError = (
  err: unknown,
  isAr: boolean,
  fallbackAr: string,
  fallbackEn: string,
): string => {
  if (err instanceof ApiError) {
    return isAr ? err.messageAr : err.messageEn;
  }
  return isAr ? fallbackAr : fallbackEn;
};

export const ENTITY_ROUTE_MAP: Record<string, string> = {
  [EntityType.TRIP]: '/trips',
  [EntityType.COMPANY]: '/companies',
  [EntityType.PROJECT]: '/projects',
  [EntityType.SERVICE]: '/services',
  [EntityType.VEHICLE]: '/fleet',
  [EntityType.DRIVER]: '/drivers',
  [EntityType.SUPPLIER]: '/suppliers',
  [EntityType.FACILITY]: '/facilities',
  [EntityType.CONTAINER]: '/inventory',
  [EntityType.TANK]: '/inventory',
  [EntityType.SCALE]: '/inventory',
  [EntityType.SIZE]: '/inventory',
  [EntityType.USER]: '/user-management',
  [EntityType.LANDING]: '/landing-settings',
};

export const buildEntityLink = (entityType: EntityType | string, entityId: string): string | undefined => {
  const route = ENTITY_ROUTE_MAP[entityType];
  if (!route || !entityId) return undefined;
  return `${route}?highlight=${encodeURIComponent(entityId)}`;
};
