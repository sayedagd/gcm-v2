"use client";

import React from 'react';
import ReportsDashboard from '@/app/(internal)/reports-dashboard/page';

const ClientReports: React.FC = () => {
    // We simply render the existing ReportsDashboard.
    // ReportsDashboard has built-in RBAC logic that automatically detects Role.COMPANY_USER 
    // and Role.PROJECT_USER, restricting all data outputs and generating valid scoped PDFs.
    return <ReportsDashboard />;
};

export default ClientReports;
