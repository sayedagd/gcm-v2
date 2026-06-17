"use client";

import { motion } from "framer-motion";
import { Home, Globe } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { useStore } from "@/context";
import { pageTransition } from "@/theme/motion";

export default function LoginPage() {
  const { saasConfig, updateSaaS, darkMode, setDarkMode } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAr = saasConfig.language === "ar";
  const nextPath = searchParams.get("next") || "";

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 transition-colors duration-300 app-shell-bg">
      {/* Top Bar */}
      <div className="surface-panel flex w-full max-w-5xl mx-auto flex-col gap-3 mb-8 rounded-[var(--radius-lg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <button
          onClick={() => router.push("/landing")}
          className="btn-ghost flex w-full items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium sm:w-auto"
        >
          <Home size={16} /> {isAr ? "العودة للموقع" : "Back to Home"}
        </button>

        <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="surface-panel flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-subtle hover:text-text-main transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => updateSaaS({ language: isAr ? "en" : "ar" })}
            className="surface-panel flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium text-text-subtle sm:flex-none"
          >
            <Globe size={16} className="text-primary" /> {isAr ? "English" : "العربية"}
          </button>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={pageTransition}
          className="auth-card z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] px-5 py-6 sm:px-6 sm:py-8 md:px-8"
        >
          <div className="text-center mb-8">
            <div className="accent-chip accent-chip-strong w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-xl mx-auto mb-4">
              G
            </div>
            <h1 className="text-2xl font-bold text-text-main">
              {isAr ? saasConfig.appNameAr : saasConfig.appNameEn}
            </h1>
            <p className="text-text-subtle font-medium mt-1 text-xs">
              {isAr ? "بوابة النظام الإداري الموحد" : "Unified Management Portal"}
            </p>
          </div>

          <LoginForm nextPath={nextPath} />
        </motion.div>
      </div>
    </div>
  );
}
