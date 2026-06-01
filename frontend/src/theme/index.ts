
import { createTheme, MantineThemeOverride } from '@mantine/core';

export const baseTheme: MantineThemeOverride = {
    fontFamily: 'Cairo, Inter, system-ui, sans-serif',
    fontFamilyMonospace: 'Monaco, Courier, monospace',
    headings: {
        fontFamily: 'Cairo, Inter, system-ui, sans-serif',
        fontWeight: '700',
    },
    primaryColor: 'emerald',
    colors: {
        emerald: [
            "#ecfdf5",
            "#d1fae5",
            "#a7f3d0",
            "#6ee7b7",
            "#34d399",
            "#10b981",
            "#059669",
            "#047857",
            "#065f46",
            "#064e3b"
        ],
        blue: [
            "#eff6ff",
            "#dbeafe",
            "#bfdbfe",
            "#93c5fd",
            "#60a5fa",
            "#3b82f6",
            "#2563eb",
            "#1d4ed8",
            "#1e40af",
            "#1e3a8a"
        ],
        violet: [
            "#f5f3ff",
            "#ede9fe",
            "#ddd6fe",
            "#c4b5fd",
            "#a78bfa",
            "#8b5cf6",
            "#7c3aed",
            "#6d28d9",
            "#5b21b6",
            "#4c1d95"
        ],
        rose: [
            "#fff1f2",
            "#ffe4e6",
            "#fecdd3",
            "#fda4af",
            "#fb7185",
            "#f43f5e",
            "#e11d48",
            "#be123c",
            "#9f1239",
            "#881337"
        ],
        orange: [
            "#fff7ed",
            "#ffedd5",
            "#fed7aa",
            "#fdba74",
            "#fb923c",
            "#f59e0b",
            "#d97706",
            "#b45309",
            "#92400e",
            "#78350f"
        ]
    },
    defaultRadius: 'lg',
    components: {
        AppShell: {
            styles: {
                main: {
                    backgroundColor: 'var(--surface-subtle)',
                },
                header: {
                    backgroundColor: 'var(--surface)',
                },
                navbar: {
                    backgroundColor: 'var(--surface)',
                },
            },
        },
        Button: {
            defaultProps: {
                size: 'md',
                fw: 700,
            },
            styles: {
                root: {
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }
            }
        },
        TextInput: {
            defaultProps: {
                size: 'md',
                variant: 'filled',
                radius: 'md',
            },
        },
        NumberInput: {
            defaultProps: { size: 'md', variant: 'filled', radius: 'md' },
        },
        PasswordInput: {
            defaultProps: { size: 'md', variant: 'filled', radius: 'md' },
        },
        Select: {
            defaultProps: {
                size: 'md',
                variant: 'filled',
                radius: 'md',
            },
        },
        Textarea: {
            defaultProps: { size: 'md', variant: 'filled', radius: 'md' },
        },
        Paper: {
            defaultProps: {
                radius: 'xl',
            },
            styles: {
                root: { transition: 'transform 0.3s ease, box-shadow 0.3s ease' }
            }
        },
        Card: {
            defaultProps: {
                radius: 'xl',
            },
            styles: {
                root: { transition: 'transform 0.3s ease, box-shadow 0.3s ease' }
            }
        },
        Modal: {
            defaultProps: {
                radius: 'xl',
                transitionProps: { transition: 'pop', duration: 300, timingFunction: 'ease-out' },
            },
            styles: {
                header: { backgroundColor: 'transparent' },
                content: { overflow: 'hidden' }
            }
        },
        NavLink: {
            styles: {
                root: {
                    borderRadius: '8px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                },
            },
        },
    },
};

export const theme = createTheme(baseTheme);

