import React from 'react';
import { Outlet } from 'react-router-dom';
import { MainLayout } from './MainLayout';
import { useLiveStream } from '@/hooks/useLiveStream';

export const DriverLayout: React.FC = () => {
    useLiveStream(); // Enable real-time updates via SSE
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
};

export default DriverLayout;
