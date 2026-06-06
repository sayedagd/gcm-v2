"use client";

import React from 'react';
import { MainLayout } from './MainLayout';
import { useLiveStream } from '@/hooks/useLiveStream';

interface DriverLayoutProps {
    children: React.ReactNode;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({ children }) => {
    useLiveStream(); // Enable real-time updates via SSE
    return (
        <MainLayout>
            {children}
        </MainLayout>
    );
};

export default DriverLayout;
