import React from 'react';
import { LucideIcon } from 'lucide-react';

export type IconType = React.ComponentType<any> | React.ReactNode | LucideIcon | any;

interface SafeIconProps {
    icon: IconType;
    className?: string;
    size?: number;
}

export const SafeIcon: React.FC<SafeIconProps> = ({ icon: Icon, className, size = 20 }) => {
    if (!Icon) return null;

    // Case 1: Icon is an already rendered element (e.g. <Home />)
    if (React.isValidElement(Icon)) {
        return React.cloneElement(Icon as React.ReactElement<any>, {
            size: size || (Icon.props as any).size,
            className: `${className || ''} ${(Icon.props as any).className || ''}`.trim()
        });
    }

    // Case 2: Icon is a Component Definition (Function or ForwardRef Object)
    // This catches the specific error where lucide-react icons are Objects in some builds
    if (typeof Icon === 'function' || typeof Icon === 'object') {
        return React.createElement(Icon as React.ComponentType<any>, { size, className });
    }

    // Fallback
    return null;
};
