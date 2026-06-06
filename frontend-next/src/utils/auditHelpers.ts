import { Trip, TripStatus } from '@/types';

export interface DuplicateGroup {
  id: string;
  type: 'DUPLICATE_TRIP';
  trips: Trip[];
  description: string;
}

/**
 * Detects duplicate trips based on same date, driver, vehicle, project, and service.
 * It ignores trips that are already CANCELLED or COMPLETED.
 */
export const detectDuplicateTrips = (allTrips: Trip[]): DuplicateGroup[] => {
  const activeTrips = allTrips.filter(t => t.status !== TripStatus.CANCELLED && t.status !== TripStatus.COMPLETED);
  
  const groups: Record<string, Trip[]> = {};

  activeTrips.forEach(trip => {
    if (!trip.date || !trip.driver_id || !trip.vehicle_id) return;

    const key = `${trip.date}_${trip.driver_id}_${trip.vehicle_id}_${trip.project_id || ''}_${trip.service_id || ''}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(trip);
  });

  const duplicates: DuplicateGroup[] = [];
  let counter = 1;

  for (const key in groups) {
    const groupedTrips = groups[key] || [];
    if (groupedTrips.length > 1) {
      duplicates.push({
        id: `dup-group-${counter++}`,
        type: 'DUPLICATE_TRIP',
        trips: groupedTrips.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // Sort to show oldest first
        description: 'Multiple active trips found with the identical Date, Driver, Vehicle, and Project.',
      });
    }
  }

  return duplicates;
};
