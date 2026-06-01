import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginMode from './LoginMode';
import RegisterMode from './RegisterMode';

interface LoginFormProps {
    onSuccess?: () => void;
    isModal?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, isModal = false }) => {
    // Mode State (Orchestrator Level)
    const [mode, setMode] = useState<'login' | 'request'>('login');

    // Portal Type State (Lifted Up to Share Context)
    // We keep track of this here so we can pass it to RegisterMode
    const [portalType, setPortalType] = useState<'STAFF' | 'CLIENT' | 'SUBCONTRACTOR'>('STAFF');

    return (
        <AnimatePresence mode="wait">
            {mode === 'login' ? (
                <LoginMode
                    key="login-mode"
                    onSuccess={onSuccess}
                    onSwitchToRequest={() => setMode('request')}
                    currentPortalType={portalType}
                    setPortalType={setPortalType}
                />
            ) : (
                <RegisterMode
                    key="register-mode"
                    onBackToLogin={() => setMode('login')}
                    initialRole={portalType}
                />
            )}
        </AnimatePresence>
    );
};

export default LoginForm;
