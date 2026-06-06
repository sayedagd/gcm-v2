import { isBefore, addDays, parseISO } from 'date-fns';
import { Vehicle, Driver } from '@/types';

export const computeVehicleStatus = (vehicle: Vehicle): 'ACTIVE' | 'WARNING' | 'MAINTENANCE' | 'INACTIVE' => {
  if (vehicle.status === 'MAINTENANCE' || vehicle.status === 'INACTIVE') {
    return vehicle.status as 'MAINTENANCE' | 'INACTIVE';
  }
  
  if (vehicle.status === 'ACTIVE' && vehicle.documents && Array.isArray(vehicle.documents)) {
    const thirtyDaysFromNow = addDays(new Date(), 30);
    const hasExpiringDoc = vehicle.documents.some((doc: any) => {
      if (!doc.expiry_date) return false;
      try {
        const expiry = parseISO(doc.expiry_date);
        return isBefore(expiry, thirtyDaysFromNow);
      } catch (e) {
        return false;
      }
    });
    
    if (hasExpiringDoc) {
      return 'WARNING';
    }
  }
  
  return vehicle.status as 'ACTIVE';
};

export const computeDriverStatus = (driver: Driver): 'ACTIVE' | 'WARNING' | 'ON_LEAVE' | 'INACTIVE' => {
  if (driver.status === 'INACTIVE' || driver.status === 'ON_LEAVE') {
    return driver.status as 'INACTIVE' | 'ON_LEAVE';
  }
  
  if (driver.status === 'ACTIVE' && driver.license_expiry) {
    const thirtyDaysFromNow = addDays(new Date(), 30);
    try {
      const expiry = parseISO(driver.license_expiry);
      if (isBefore(expiry, thirtyDaysFromNow)) {
        return 'WARNING';
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return driver.status as 'ACTIVE';
};
