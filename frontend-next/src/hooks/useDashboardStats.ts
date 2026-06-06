import { useMemo } from 'react';
import { useStore } from '@/context';
import { TripStatus } from '@/types';
import { isWithinInterval, startOfDay, endOfDay, subDays, addDays, parseISO, isBefore } from 'date-fns';

export interface DashboardStats {
  activeTripsToday: number;
  activeTripsYesterday: number;
  tripsGrowth: number;
  vehiclesNeedingAttention: number;
  driversNeedingAttention: number;
  totalRevenue?: number; // Optional, if needed
}

export const useDashboardStats = (): DashboardStats => {
  const { allTrips, vehicles, drivers } = useStore();

  return useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const yesterdayEnd = endOfDay(subDays(new Date(), 1));

    // 1. Trips Aggregations
    let activeTripsToday = 0;
    let activeTripsYesterday = 0;

    allTrips.forEach(trip => {
      // Active trips are trips that are not cancelled
      if (trip.status === TripStatus.CANCELLED) return;
      
      try {
        const tripDate = parseISO(trip.date);
        if (isWithinInterval(tripDate, { start: todayStart, end: todayEnd })) {
          activeTripsToday++;
        } else if (isWithinInterval(tripDate, { start: yesterdayStart, end: yesterdayEnd })) {
          activeTripsYesterday++;
        }
      } catch (e) {
        // Ignore invalid dates
      }
    });

    const tripsGrowth = activeTripsYesterday === 0 
      ? (activeTripsToday > 0 ? 100 : 0) 
      : Math.round(((activeTripsToday - activeTripsYesterday) / activeTripsYesterday) * 100);

    // 2. Vehicles Needing Attention
    // Vehicles in MAINTENANCE or with documents expiring within 30 days
    let vehiclesNeedingAttention = 0;
    const thirtyDaysFromNow = addDays(new Date(), 30);

    vehicles.forEach(vehicle => {
      if (vehicle.status === 'MAINTENANCE') {
        vehiclesNeedingAttention++;
        return;
      }
      if (vehicle.status === 'ACTIVE' && vehicle.documents && Array.isArray(vehicle.documents)) {
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
          vehiclesNeedingAttention++;
        }
      }
    });

    // 3. Drivers Needing Attention
    // Drivers with license expiring within 30 days
    let driversNeedingAttention = 0;
    drivers.forEach(driver => {
      if (driver.status === 'ACTIVE' && driver.license_expiry) {
        try {
          const expiry = parseISO(driver.license_expiry);
          if (isBefore(expiry, thirtyDaysFromNow)) {
            driversNeedingAttention++;
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    return {
      activeTripsToday,
      activeTripsYesterday,
      tripsGrowth,
      vehiclesNeedingAttention,
      driversNeedingAttention,
    };
  }, [allTrips, vehicles, drivers]);
};
