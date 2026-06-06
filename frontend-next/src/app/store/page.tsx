"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LoginModal } from "@/components/layout/LoginModal";
import { useStore } from "@/context";

type EquipmentItem = {
  equipment_id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  status?: string;
};

export default function StorePage() {
  const {
    saasConfig,
    environmentalEquipments,
    api,
    setEnvironmentalEquipments,
    submitEquipmentInquiry,
  } = useStore();
  const isAr = saasConfig.language === "ar";
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EquipmentItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    api
      .getEquipments()
      .then((result) => {
        if (!mounted || !Array.isArray(result)) {
          return;
        }

        setEnvironmentalEquipments(result);
      })
      .catch(() => {
        // Keep current state as-is on public fetch failure.
      });

    return () => {
      mounted = false;
    };
  }, [api, setEnvironmentalEquipments]);

  const filtered = useMemo(() => {
    const items = (environmentalEquipments || []) as EquipmentItem[];
    const q = search.trim().toLowerCase();

    if (!q) {
      return items;
    }

    return items.filter((item) => {
      const label = (isAr ? item.name_ar : item.name_en) || "";
      return label.toLowerCase().includes(q);
    });
  }, [environmentalEquipments, isAr, search]);

  const onSubmitInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEquipmentInquiry({
        customer_name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        message: form.message,
        equipment_id: selected.equipment_id,
        product_name_snapshot: isAr ? selected.name_ar : selected.name_en,
      });

      setForm({ name: "", email: "", phone: "", company: "", message: "" });
      setSelected(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background transition-colors ${isAr ? "text-right" : "text-left"}`}>
      <PublicNavbar isScrolled={false} setIsLoginModalOpen={setIsLoginModalOpen} />

      <main className="pt-36 pb-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black text-text-main">
            {isAr ? saasConfig.storePage?.heroTitleAr : saasConfig.storePage?.heroTitleEn}
          </h1>
          <p className="mt-4 text-text-subtle text-lg max-w-3xl">
            {isAr ? saasConfig.storePage?.heroDescAr : saasConfig.storePage?.heroDescEn}
          </p>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isAr ? "ابحث عن جهاز" : "Search equipment"}
            className={`mt-8 w-full rounded-2xl border border-border bg-surface px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 ${
              isAr ? "text-right" : "text-left"
            }`}
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <article key={item.equipment_id} className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-xl font-bold text-text-main">{isAr ? item.name_ar : item.name_en}</h2>
                <p className="mt-2 text-sm text-text-subtle line-clamp-3">
                  {isAr ? item.description_ar : item.description_en}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600 uppercase">{item.status || "available"}</span>
                  <button
                    onClick={() => setSelected(item)}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
                  >
                    {isAr ? "طلب عرض" : "Inquire"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-[140] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-2xl font-black text-text-main">
              {isAr ? "طلب عرض سعر" : "Request Quote"}
            </h3>
            <p className="mt-1 text-sm text-text-subtle">{isAr ? selected.name_ar : selected.name_en}</p>

            <form className="mt-5 space-y-3" onSubmit={onSubmitInquiry}>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={isAr ? "الاسم" : "Name"}
                required
                className="w-full rounded-xl border border-border bg-surface-subtle px-4 py-3 outline-none"
              />
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={isAr ? "البريد الإلكتروني" : "Email"}
                required
                type="email"
                className="w-full rounded-xl border border-border bg-surface-subtle px-4 py-3 outline-none"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder={isAr ? "الهاتف" : "Phone"}
                className="w-full rounded-xl border border-border bg-surface-subtle px-4 py-3 outline-none"
              />
              <input
                value={form.company}
                onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                placeholder={isAr ? "الشركة" : "Company"}
                className="w-full rounded-xl border border-border bg-surface-subtle px-4 py-3 outline-none"
              />
              <textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder={isAr ? "الرسالة" : "Message"}
                className="w-full rounded-xl border border-border bg-surface-subtle px-4 py-3 outline-none min-h-[110px]"
              />

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-main"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {isSubmitting ? (isAr ? "جارٍ الإرسال..." : "Sending...") : isAr ? "إرسال" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <PublicFooter />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
