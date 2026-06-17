import { createTheme, MantineThemeOverride, type MantineColorsTuple } from "@mantine/core";

const brandScale: MantineColorsTuple = [
    "#ecfdf5",
    "#d1fae5",
    "#a7f3d0",
    "#6ee7b7",
    "#34d399",
    "#10b981",
    "#059669",
    "#047857",
    "#065f46",
    "#064e3b",
];

const dangerScale: MantineColorsTuple = [
    "#fff1f2",
    "#ffe4e6",
    "#fecdd3",
    "#fda4af",
    "#fb7185",
    "#f43f5e",
    "#e11d48",
    "#be123c",
    "#9f1239",
    "#881337",
];

const slateScale: MantineColorsTuple = [
    "#f8fafc",
    "#f1f5f9",
    "#e2e8f0",
    "#cbd5e1",
    "#94a3b8",
    "#64748b",
    "#475569",
    "#334155",
    "#1e293b",
    "#0f172a",
];

export const baseTheme: MantineThemeOverride = {
    autoContrast: true,
    primaryColor: "brand",
    defaultRadius: "xl",
    fontFamily: "var(--font-cairo), sans-serif",
    fontFamilyMonospace:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    headings: {
        fontFamily: "var(--font-cairo), sans-serif",
        fontWeight: "700",
    },
    colors: {
        brand: brandScale,
        danger: dangerScale,
        slate: slateScale,
    },
    components: {
        AppShell: {
            styles: {
                main: {
                    backgroundColor: "transparent",
                },
                header: {
                    backgroundColor: "transparent",
                    borderBottom: "none",
                },
                navbar: {
                    backgroundColor: "transparent",
                },
            },
        },
        Button: {
            defaultProps: {
                size: "md",
                fw: 700,
                radius: "xl",
            },
            styles: {
                root: {
                    borderRadius: "var(--radius-md)",
                    transition:
                        "transform var(--motion-fast) ease, box-shadow var(--motion-fast) ease, background-color var(--motion-fast) ease, border-color var(--motion-fast) ease",
                    boxShadow: "var(--shadow-soft)",
                },
            },
        },
        ActionIcon: {
            defaultProps: {
                radius: "xl",
                variant: "subtle",
            },
            styles: {
                root: {
                    color: "var(--text-subtle)",
                    backgroundColor: "color-mix(in srgb, var(--surface) 86%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--border-color) 84%, transparent)",
                    transition:
                        "background-color var(--motion-fast) ease, border-color var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) ease",
                },
            },
        },
        TextInput: {
            defaultProps: { size: "md", radius: "xl" },
            styles: {
                input: {
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-main)",
                    borderRadius: "var(--radius-md)",
                },
            },
        },
        NumberInput: {
            defaultProps: { size: "md", radius: "xl" },
        },
        PasswordInput: {
            defaultProps: { size: "md", radius: "xl" },
        },
        Select: {
            defaultProps: { size: "md", radius: "xl" },
        },
        Textarea: {
            defaultProps: { size: "md", radius: "xl" },
        },
        Paper: {
            defaultProps: { radius: "xl" },
            styles: {
                root: {
                    backgroundColor: "color-mix(in srgb, var(--surface) 94%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--border-color) 88%, transparent)",
                    boxShadow: "var(--shadow-panel)",
                },
            },
        },
        Card: {
            defaultProps: { radius: "xl" },
            styles: {
                root: {
                    backgroundColor: "color-mix(in srgb, var(--surface) 94%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--border-color) 88%, transparent)",
                    boxShadow: "var(--shadow-panel)",
                    transition:
                        "transform var(--motion-fast) ease, box-shadow var(--motion-fast) ease, border-color var(--motion-fast) ease",
                },
            },
        },
        Modal: {
            defaultProps: {
                radius: "xl",
                transitionProps: {
                    transition: "pop",
                    duration: 220,
                    timingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                },
            },
            styles: {
                content: {
                    overflow: "hidden",
                    backgroundColor: "color-mix(in srgb, var(--surface) 96%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--border-color) 88%, transparent)",
                    boxShadow: "var(--shadow-panel-strong)",
                },
                header: {
                    backgroundColor: "transparent",
                },
            },
        },
        Menu: {
            defaultProps: {
                radius: "xl",
                shadow: "md",
            },
            styles: {
                dropdown: {
                    backgroundColor: "color-mix(in srgb, var(--surface) 98%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--border-color) 88%, transparent)",
                    boxShadow: "var(--shadow-panel)",
                },
                item: {
                    borderRadius: "calc(var(--radius-sm) - 2px)",
                    color: "var(--text-main)",
                },
            },
        },
        NavLink: {
            styles: {
                root: {
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    transition:
                        "background-color var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) ease",
                },
            },
        },
    },
};

export const theme = createTheme(baseTheme);

