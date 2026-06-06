import React from 'react';
import { MainLayout } from './MainLayout';
import { useLiveStream } from '@/hooks/useLiveStream';

interface SubcontractorLayoutProps {
    children: React.ReactNode;
}

export const SubcontractorLayout: React.FC<SubcontractorLayoutProps> = ({ children }) => {
    useLiveStream(); // Enable real-time updates via SSE
    return (
        <MainLayout>
            {children}
        </MainLayout>
    );
};

export default SubcontractorLayout;
