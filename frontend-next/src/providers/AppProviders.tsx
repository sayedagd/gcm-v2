"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MantineProvider } from "@mantine/core";
import { LEGACY_BOOTSTRAP_COOKIE } from "@/features/auth/model/sessionCookies";
import { StoreInitializer, useGCMStore } from "@/store";
import { theme } from "@/theme";
import { Role, User } from "@/types";

type AppProvidersProps = {
  children: React.ReactNode;
};

const getLanguage = (): "ar" | "en" => {
  const saved = localStorage.getItem("gcm_language");
  if (saved === "ar" || saved === "en") {
    return saved;
  }

  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
};

const getPrimaryColor = (): string => {
  return localStorage.getItem("gcm_primary_color") || "#10b981";
};

const getCookie = (name: string): string | null => {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!found) {
    return null;
  }

  const value = found.slice(name.length + 1);
  return value || null;
};

const clearLegacySessionStorage = () => {
  localStorage.removeItem("gcm_auth_session");
  localStorage.removeItem("gcm_current_role");
  localStorage.removeItem("gcm_auth_exp");
  localStorage.removeItem("gcm_current_user");
  localStorage.removeItem("gcm_last_active");
};

export function AppProviders({ children }: AppProvidersProps) {
  const pathname = usePathname();
  const saasConfig = useGCMStore((state) => state.saasConfig);
  const darkMode = useGCMStore((state) => state.darkMode);
  const setCurrentUser = useGCMStore((state) => state.setCurrentUser);
  const setIsAuthenticated = useGCMStore((state) => state.setIsAuthenticated);
  const loadAllData = useGCMStore((state) => state.loadAllData);

  useEffect(() => {
    const bootstrapCookie = getCookie(LEGACY_BOOTSTRAP_COOKIE);
    if (!bootstrapCookie) {
      return;
    }

    try {
      const decoded = decodeURIComponent(bootstrapCookie);
      const bootstrap = JSON.parse(decoded) as {
        id: string;
        name: string;
        email: string;
        role: string;
        company_id?: string | null;
        project_id?: string | null;
        supplier_id?: string | null;
        expiresAtMs?: number;
      };

      const user: User = {
        id: bootstrap.id,
        name: bootstrap.name,
        email: bootstrap.email,
        role: bootstrap.role as Role,
        ...(bootstrap.company_id ? { company_id: bootstrap.company_id } : {}),
        ...(bootstrap.project_id ? { project_id: bootstrap.project_id } : {}),
        ...(bootstrap.supplier_id ? { supplier_id: bootstrap.supplier_id } : {}),
      };

      localStorage.setItem("gcm_auth_session", "true");
      localStorage.setItem("gcm_current_role", bootstrap.role || "");
      if (bootstrap.expiresAtMs) {
        localStorage.setItem("gcm_auth_exp", String(bootstrap.expiresAtMs));
      }

      localStorage.setItem("gcm_current_user", JSON.stringify(user));
      localStorage.setItem("gcm_last_active", String(Date.now()));

      // Synchronize authenticated state to Zustand store immediately
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadAllData();
    } catch {
      // Ignore malformed bootstrap cookie and proceed with normal flow.
    }

    document.cookie = `${LEGACY_BOOTSTRAP_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [pathname, setCurrentUser, setIsAuthenticated, loadAllData]);

  useEffect(() => {
    if (window.location.pathname !== "/login") {
      return;
    }

    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "signed_out" || reason === "session_expired") {
      clearLegacySessionStorage();
    }
  }, []);

  useEffect(() => {
    const language = saasConfig?.language || getLanguage();
    const direction = language === "ar" ? "rtl" : "ltr";

    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.documentElement.dataset.lang = language;
    document.documentElement.classList.toggle("arabic-ui", language === "ar");
  }, [saasConfig?.language]);

  useEffect(() => {
    const color = saasConfig?.primaryColor || getPrimaryColor();
    document.documentElement.style.setProperty("--primary-color", color);
  }, [saasConfig?.primaryColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!darkMode);
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      forceColorScheme={darkMode ? "dark" : "light"}
    >
      <StoreInitializer />
      {children}
    </MantineProvider>
  );
}
