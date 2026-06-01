import React from 'react';
import ReportsDashboard from '@/pages/ReportsDashboard';

const ClientReports: React.FC = () => {
    // We simply render the existing ReportsDashboard.
    // ReportsDashboard has built-in RBAC logic that automatically detects Role.COMPANY_USER 
    // and Role.PROJECT_USER, restricting all data outputs and generating valid scoped PDFs.
    return <ReportsDashboard />;
};

export default ClientReports;
