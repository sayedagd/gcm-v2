"use client";

import Link from "next/link";
import { BarChart3, FileText, Headset, Sparkles } from "lucide-react";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";

export default function ClientDashboardPage() {
  const { isAr } = useTranslation();
  const { saasConfig } = useStore();
  const heroImage =
    saasConfig?.landingPage?.heroBgUrl ||
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-border p-6 md:p-8 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url('${heroImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold">{isAr ? "لوحة العميل" : "Client Portal"}</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black">{isAr ? "متابعة الخدمات والطلبات" : "Service Tracking & Requests"}</h1>
        <p className="mt-2 text-sm text-slate-200">{isAr ? "عرض مباشر للتقارير وحالة الطلبات وقنوات الدعم." : "Live access to reports, request workflows, and support channels."}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/client/reports" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <BarChart3 className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "تقارير العميل" : "Client Reports"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "مؤشرات الأداء والنتائج." : "KPIs and delivery outcomes."}</p>
        </Link>

        <Link href="/client/account" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <FileText className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "الحساب" : "Account"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "بيانات الشركة والحساب." : "Company profile and account details."}</p>
        </Link>

        <Link href="/client/support" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <Headset className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "الدعم" : "Support"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "فتح ومتابعة طلبات الخدمة." : "Open and track service requests."}</p>
        </Link>
      </section>

      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 border border-emerald-200">
        <Sparkles size={14} />
        {isAr ? "واجهة العميل الفعلية أصبحت مفعلة" : "Client dashboard is now active (not a migration shell)"}
      </div>
    </div>
  );
}
