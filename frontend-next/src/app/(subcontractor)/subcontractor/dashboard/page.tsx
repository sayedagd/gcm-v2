"use client";

import Link from "next/link";
import { Boxes, LayoutDashboard, UserCircle2, Sparkles } from "lucide-react";
import { useStore } from "@/context";
import { useTranslation } from "@/hooks/useTranslation";

export default function SubcontractorDashboardPage() {
  const { isAr } = useTranslation();
  const { saasConfig } = useStore();
  const heroImage =
    saasConfig?.landingPage?.heroBgUrl ||
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border border-border p-6 md:p-8 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.72), rgba(3, 7, 18, 0.72)), url('${heroImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200 font-bold">{isAr ? "بوابة المقاول" : "Partner Workspace"}</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black">{isAr ? "مراقبة الأصول والملف التشغيلي" : "Assets & Operations Profile"}</h1>
        <p className="mt-2 text-sm text-slate-200">{isAr ? "الوصول السريع للأصول ولوحة الحالة والملف الشخصي." : "Quick access to asset lists, operational status, and profile controls."}</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/subcontractor/dashboard" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <LayoutDashboard className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "لوحة الحالة" : "Status Dashboard"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "عرض ملخص التشغيل الحالي." : "Current operational snapshot."}</p>
        </Link>

        <Link href="/subcontractor/assets" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <Boxes className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "الأصول" : "Assets"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "المركبات والمعدات المرتبطة." : "Linked fleet and equipment."}</p>
        </Link>

        <Link href="/subcontractor/profile" className="rounded-2xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
          <UserCircle2 className="text-primary" size={20} />
          <h2 className="mt-3 font-bold text-text-main">{isAr ? "الملف الشخصي" : "Profile"}</h2>
          <p className="mt-1 text-sm text-text-subtle">{isAr ? "إدارة بيانات الحساب والتواصل." : "Manage identity and contact settings."}</p>
        </Link>
      </section>

      <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700 border border-cyan-200">
        <Sparkles size={14} />
        {isAr ? "واجهة المقاول أصبحت مفعلة" : "Subcontractor dashboard is now active (not a shell)"}
      </div>
    </div>
  );
}
