"use client";

import { useMemo, useState } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LoginModal } from "@/components/layout/LoginModal";
import { useStore } from "@/context";

type LandingService = {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
};

export default function LandingPage() {
  const { saasConfig } = useStore();
  const isAr = saasConfig.language === "ar";
  const lp = saasConfig.landingPage;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const services = useMemo(() => {
    const custom = Array.isArray(lp?.services) ? (lp.services as LandingService[]) : [];
    const defaults = Array.isArray(lp?.defaultServices) ? (lp.defaultServices as LandingService[]) : [];
    return custom.length > 0 ? custom : defaults;
  }, [lp]);

  return (
    <div className={`min-h-screen bg-background transition-colors ${isAr ? "text-right" : "text-left"}`}>
      <PublicNavbar isScrolled={false} setIsLoginModalOpen={setIsLoginModalOpen} />

      <main>
        <section className="pt-36 pb-16 px-6 md:px-10 bg-surface-subtle border-b border-border">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black text-text-main leading-tight">
              {isAr ? lp?.heroTitleAr : lp?.heroTitleEn}
            </h1>
            <p className="mt-4 text-text-subtle text-lg max-w-3xl">
              {isAr ? lp?.heroDescAr : lp?.heroDescEn}
            </p>
          </div>
        </section>

        <section id="about" className="py-16 px-6 md:px-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-text-main">{isAr ? lp?.aboutTitleAr : lp?.aboutTitleEn}</h2>
            <p className="mt-4 text-text-subtle whitespace-pre-wrap">
              {isAr ? lp?.aboutTextAr : lp?.aboutTextEn}
            </p>
          </div>
        </section>

        <section id="services" className="py-16 px-6 md:px-10 bg-surface-subtle border-y border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-text-main">
              {isAr ? lp?.servicesSectionTitleAr : lp?.servicesSectionTitleEn}
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {services.map((service) => (
                <article key={service.id} className="rounded-2xl border border-border bg-surface p-5">
                  <h3 className="text-lg font-bold text-text-main">{isAr ? service.titleAr : service.titleEn}</h3>
                  <p className="mt-2 text-sm text-text-subtle">{isAr ? service.descAr : service.descEn}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fleet" className="py-16 px-6 md:px-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-text-main">
              {isAr ? lp?.fleetSectionTitleAr : lp?.fleetSectionTitleEn}
            </h2>
            <p className="mt-4 text-text-subtle">
              {isAr ? lp?.fleetSectionDescAr : lp?.fleetSectionDescEn}
            </p>
          </div>
        </section>

        <section id="contact" className="py-16 px-6 md:px-10 bg-surface-subtle border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-text-main">{isAr ? lp?.contactTitleAr : lp?.contactTitleEn}</h2>
            <p className="mt-4 text-text-subtle">{isAr ? lp?.contactDescAr : lp?.contactDescEn}</p>
            {lp?.contactRecipientEmail ? (
              <p className="mt-3 text-primary-600 font-bold">{lp.contactRecipientEmail}</p>
            ) : null}
            {lp?.contactPhone ? <p className="mt-1 text-text-main font-bold">{lp.contactPhone}</p> : null}
          </div>
        </section>
      </main>

      <PublicFooter />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
