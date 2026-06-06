/**
 * =====================================================
 * [AR] مكون الهيدر العلوي
 * [EN] Header Component
 * =====================================================
 */

import React from 'react';
import { Menu, Moon, Sun, Globe, Bell } from 'lucide-react';

interface HeaderProps {
    onMenuToggle: () => void;
    onThemeToggle: () => void;
    onLanguageToggle: () => void;
    isDarkMode: boolean;
    isAr: boolean;
    userName: string;
    unreadCount?: number;
    onNotificationsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    onMenuToggle,
    onThemeToggle,
    onLanguageToggle,
    isDarkMode,
    isAr,
    userName,
    unreadCount = 0,
    onNotificationsClick
}) => {
    return (
        <header className="sticky top-0 z-50 bg-surface border-b border-border px-5 py-3 transition-colors duration-0">
            <div className="flex items-center justify-between">
                {/* Left: Menu Toggle */}
                <button
                    onClick={onMenuToggle}
                    className="xl:hidden w-9 h-9 rounded-lg hover:bg-surface-subtle flex items-center justify-center transition-colors"
                >
                    <Menu size={20} className="text-text-subtle" />
                </button>

                {/* Center: Welcome Message (Hidden on mobile) */}
                <div className="hidden md:block">
                    <h1 className="text-sm font-semibold text-text-main">
                        {isAr ? `مرحباً، ${String(userName || '')}` : `Welcome, ${String(userName || '')}`}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    {onNotificationsClick && (
                        <button
                            onClick={onNotificationsClick}
                            className="relative w-9 h-9 rounded-lg hover:bg-surface-subtle flex items-center justify-center transition-colors"
                        >
                            <Bell size={20} className="text-text-subtle" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeToggle}
                        className="w-9 h-9 rounded-lg hover:bg-surface-subtle flex items-center justify-center transition-colors"
                    >
                        {isDarkMode ? (
                            <Sun size={20} className="text-text-subtle" />
                        ) : (
                            <Moon size={20} className="text-text-subtle" />
                        )}
                    </button>

                    {/* Language Toggle */}
                    <button
                        onClick={onLanguageToggle}
                        className="h-9 px-2.5 rounded-lg hover:bg-surface-subtle flex items-center gap-1.5 transition-colors"
                    >
                        <Globe size={20} className="text-text-subtle" />
                        <span className="text-xs font-semibold text-text-subtle">
                            {isAr ? 'AR' : 'EN'}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
