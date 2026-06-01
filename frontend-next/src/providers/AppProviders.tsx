"use client";

import { useEffect } from "react";

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

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    const language = getLanguage();
    const direction = language === "ar" ? "rtl" : "ltr";

    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.documentElement.dataset.lang = language;
  }, []);

  useEffect(() => {
    const color = getPrimaryColor();
    document.documentElement.style.setProperty("--primary-color", color);
  }, []);

  return <>{children}</>;
}
