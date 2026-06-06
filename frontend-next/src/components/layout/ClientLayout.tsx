import React from 'react';
import { MainLayout } from './MainLayout';
import { useLiveStream } from '@/hooks/useLiveStream';

interface ClientLayoutProps {
    children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
    useLiveStream(); // Enable real-time updates via SSE
    return (
        <MainLayout>
            {children}
        </MainLayout>
    );
};

export default ClientLayout;
