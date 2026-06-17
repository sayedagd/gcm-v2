export const getDriverCategoryOptions = (isAr: boolean) => ([
  { label: isAr ? '🔧 الكادر الميداني' : '🔧 FIELD OPERATIONS', value: 'OPERATIONS' },
  { label: isAr ? '💼 الهيكل الإداري' : '💼 MANAGEMENT STRUCTURE', value: 'MANAGEMENT' },
]);

export const getDriverOwnershipOptions = () => ([
  { label: '🏢 GCM (CORE TEAM)', value: 'INTERNAL' },
  { label: '🤝 EXTERNAL PARTNER', value: 'SUPPLIER' },
]);

export const getDriverStatusOptions = () => ([
  { label: '✅ READY / ACTIVE', value: 'ACTIVE' },
  { label: '⏸️ TEMPORARY LEAVE', value: 'ON_LEAVE' },
  { label: '❌ DECOMMISSIONED', value: 'INACTIVE' },
]);

export const getVehicleTypeOptions = () => ([
  { label: 'HOOK LIFT SYSTEM', value: 'Hook Lift' },
  { label: 'COMPACTOR UNIT', value: 'Compactor' },
  { label: 'WATER TANKER', value: 'Water Tanker' },
  { label: 'SMALL PICKUP', value: 'Small Pickup' },
  { label: 'FLATBED TRUCK', value: 'Flatbed' },
]);

export const getVehicleStatusOptions = () => ([
  { label: 'READY / ACTIVE', value: 'ACTIVE' },
  { label: 'IN MAINTENANCE', value: 'MAINTENANCE' },
  { label: 'DECOMMISSIONED', value: 'INACTIVE' },
]);

export const getSupplierCategoryOptions = () => ([
  { label: 'Logistics (Fleet)', value: 'VEHICLES' },
  { label: 'Equipment (Bins)', value: 'CONTAINERS' },
  { label: 'Manpower (Staff)', value: 'STAFF' },
  { label: 'General Services', value: 'GENERAL' },
]);

export const getInventoryAssetTypeOptions = () => ([
  { label: 'CONTAINER', value: 'CONTAINER' },
  { label: 'TANK', value: 'TANK' },
  { label: 'SCALE', value: 'SCALE' },
]);

export const getInventoryOwnershipOptions = () => ([
  { label: 'GCM_INTERNAL (OWN)', value: 'OWN' },
  { label: 'EXTERNAL (SUPPLIER)', value: 'SUPPLIER' },
]);

export const getFacilityTypeOptions = () => ([
  { label: 'DISPOSAL', value: 'DISPOSAL' },
  { label: 'RECYCLE', value: 'RECYCLE' },
  { label: 'SEWAGE_TREATMENT', value: 'SEWAGE_TREATMENT' },
]);

export const getFacilityStatusOptions = (isAr: boolean) => ([
  { label: isAr ? 'نشط' : 'Active', value: 'ACTIVE' },
  { label: isAr ? 'غير نشط' : 'Inactive', value: 'INACTIVE' },
]);

export const getTripUnitOptions = () => ([
  { label: 'TON', value: 'TON' },
  { label: 'CBM', value: 'CBM' },
  { label: 'KG', value: 'KG' },
]);

export const getTripQuantityPresets = (unit: 'TON' | 'CBM' | 'KG', isAr: boolean) => {
  if (unit === 'CBM') {
    return [16, 18, 32].map((value) => ({ label: `${value} CBM`, value: value.toString() }));
  }

  if (unit === 'KG') {
    return [1000, 2000, 5000].map((value) => ({ label: `${value} KG`, value: value.toString() }));
  }

  return [5, 16, 32].map((value) => ({ label: `${value} ${isAr ? 'طن' : 'TON'}`, value: value.toString() }));
};