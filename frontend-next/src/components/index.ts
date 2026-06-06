/**
 * =====================================================
 * [AR] ملف تصدير المكونات - Index
 * [EN] Components Export Index
 * =====================================================
 * 
 * [AR] يسهل استيراد المكونات من مكان واحد
 * [EN] Simplifies importing components from a single location
 */

// Layout Components
export { default as Header } from './layout/Header';
export { default as ConnectivityBadge } from './layout/ConnectivityBadge';

// UI Components
export { default as Card } from './ui/Card';
export { default as StatCard } from './ui/StatCard';
export { default as Table } from './ui/Table';
export { default as Modal } from './ui/Modal';
export { default as Button } from './ui/Button';
export { default as Input } from './ui/Input';
export { default as Textarea } from './ui/Textarea';
export { default as Select } from './ui/Select';
export { default as FileUploader } from './ui/FileUploader';
export { default as PageHeader } from './ui/PageHeader';
export { default as SmartDropdown } from './ui/SmartDropdown';
export { default as SearchableSelect } from './ui/SearchableSelect';
export { default as ColorPicker } from './ui/ColorPicker';
export { default as Badge } from './ui/Badge';
export { default as MultiSelect } from './ui/MultiSelect';

// Common Components
export { default as LoadingSpinner } from './common/LoadingSpinner';
export { default as EmptyState } from './common/EmptyState';
export { default as InstallWebAppPrompt } from './common/InstallWebAppPrompt';
export { default as ToastContainer } from './common/ToastContainer';
export { default as DeleteConfirmModal } from './common/DeleteConfirmModal';
export { ConfirmDialog, useConfirmDialog } from './common/ConfirmDialog';
export {
  SkeletonFullPage, SkeletonCardGrid, SkeletonTable,
  SkeletonStatsGrid, SkeletonPageHeader, SkeletonChart,
  SkeletonCard, SkeletonStatCard, SkeletonBlock,
} from './common/PageSkeleton';

// Audit
export { default as SystemAudit } from './audit/SystemAudit';

// Inventory
export { default as InventoryStats } from './inventory/InventoryStats';
export { default as InventoryCard } from './inventory/InventoryCard';
export { default as InventoryDetails } from './inventory/InventoryDetails';
export { default as InventoryWizard } from './inventory/InventoryWizard';

// Services
export { default as ServiceStats } from './services/ServiceStats';
export { default as ServiceTree } from './services/ServiceTree';
export { default as ServiceWizard } from './services/ServiceWizard';
export { ServiceDashboardModal } from './services/ServiceDashboardModal';

// Users
export { default as UserStats } from './users/UserStats';
export { default as UserCard } from './users/UserCard';
export { default as UserWizard } from './users/UserWizard';
export { default as UserDetails } from './users/UserDetails';
export { default as QuickUserModal } from './users/QuickUserModal';

// Suppliers
export { default as SupplierStats } from './suppliers/SupplierStats';
export { default as SupplierCard } from './suppliers/SupplierCard';
export { default as SupplierWizard } from './suppliers/SupplierWizard';
export { default as SupplierDetails } from './suppliers/SupplierDetails';

// Facilities
export { default as FacilityCard } from './facilities/FacilityCard';
export { default as FacilityWizard } from './facilities/FacilityWizard';
export { default as FacilityDetails } from './facilities/FacilityDetails';

// Finance
export { default as FinanceStats } from './finance/FinanceStats';
export { default as FinanceFilters } from './finance/FinanceFilters';
export { default as CompanyFinancials } from './finance/CompanyFinancials';
export { default as SupplierFinancials } from './finance/SupplierFinancials';

// Reports Dashboard
export { default as DashboardStats } from './reports/DashboardStats';
export { default as DashboardCharts } from './reports/DashboardCharts';
export { default as DashboardActionItems } from './reports/DashboardActionItems';
export { default as ServiceTripStats } from './reports/ServiceTripStats';

// Reports
export { default as ReportsFilters } from './reports/ReportsFilters';
export { default as ReportsStats } from './reports/ReportsStats';
export { default as LogisticsMap } from './reports/LogisticsMap';
export { default as PeakHoursChart } from './reports/PeakHoursChart';
export { default as ServiceMixChart } from './reports/ServiceMixChart';
export { default as VolumeTrendChart } from './reports/VolumeTrendChart';
export { default as TopDriversList } from './reports/TopDriversList';
export { default as DrilldownSelection } from './reports/DrilldownSelection';
export { default as StatusDistributionChart } from './reports/StatusDistributionChart';
export { default as TopProjectsChart } from './reports/TopProjectsChart';
export { default as MonthlyTonnageChart } from './reports/MonthlyTonnageChart';
export { default as VehicleUtilizationChart } from './reports/VehicleUtilizationChart';
// Landing
export { default as CarbonImpactSection } from './landing/CarbonImpactSection';
// Trips
export * from './trips';
export { SignatureApproveModal } from './ui/SignatureApproveModal';
