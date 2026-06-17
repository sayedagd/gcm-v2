"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Truck, ShieldCheck, Recycle, Droplets, Factory, Settings, Globe,
  Activity, BarChart3, MapPin, Leaf, Zap, Users, CheckCircle2, Star
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LoginModal } from "@/components/layout/LoginModal";
import CarbonImpactSection from "@/components/landing/CarbonImpactSection";
import LandingHero from "@/components/landing/LandingHero";
import LandingCertifications from "@/components/landing/LandingCertifications";
import LandingAbout from "@/components/landing/LandingAbout";
import LandingServices from "@/components/landing/LandingServices";
import LandingContact from "@/components/landing/LandingContact";
import { useStore } from "@/context";

// --- XSS Sanitizer ---
const sanitizeInput = (input: string) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
};

// --- Icon helpers (shared with sub-components) ---
const getIcon = (type: string, url?: string): React.ReactNode => {
  if (type === "custom" && url)
    return <img src={url} className="w-full h-full object-contain p-2" alt="" />;
  switch (type) {
    case "truck": return <Truck size={32} />;
    case "shield": return <ShieldCheck size={32} />;
    case "recycle": return <Recycle size={32} />;
    case "droplet": return <Droplets size={32} />;
    case "factory": return <Factory size={32} />;
    case "settings": return <Settings size={32} />;
    case "globe": return <Globe size={32} />;
    default: return <Activity size={32} />;
  }
};

const scIcon = (type: string, size = 18, url?: string): React.ReactNode => {
  if (type === "custom" && url)
    return <img src={url} style={{ width: size, height: size }} className="object-contain" alt="" />;
  switch (type) {
    case "mapPin": return <MapPin size={size} />;
    case "barChart": return <BarChart3 size={size} />;
    case "shield": return <ShieldCheck size={size} />;
    case "users": return <Users size={size} />;
    case "leaf": return <Leaf size={size} />;
    case "zap": return <Zap size={size} />;
    case "globe": return <Globe size={size} />;
    case "truck": return <Truck size={size} />;
    default: return <Activity size={size} />;
  }
};

const DEFAULT_SC = {
  badgeAr: "نظام GCM-ERP",
  badgeEn: "GCM-ERP System",
  titleAr: "نظام ذكي يخدم عملياتكم البيئية",
  titleEn: "Smart System Powering Your Environmental Operations",
  descAr: "نظام GCM-ERP هو منصة رقمية متكاملة صُممت خصيصاً لإدارة عمليات النفايات والخدمات البيئية.",
  descEn: "GCM-ERP is an integrated digital platform specifically designed for managing waste operations and environmental services.",
  imageTopUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80",
  imageBottomUrl: "https://images.unsplash.com/photo-1541888941255-658066889e40?auto=format&fit=crop&q=80",
  features: [
    { icon: "mapPin", textAr: "تتبع GPS لحظي لكل رحلة نقل", textEn: "Real-time GPS tracking for every transport trip" },
    { icon: "barChart", textAr: "تقارير تحليلية وإحصاءات تلقائية", textEn: "Automated analytical reports and statistics" },
    { icon: "shield", textAr: "بيانات وزن وشهادات تخلص معتمدة", textEn: "Certified weight data and disposal certificates" },
    { icon: "users", textAr: "بوابة عملاء مخصصة وآمنة", textEn: "Dedicated and secure client portal" },
  ],
  stats: [
    { icon: "leaf", value: "80%", labelAr: "تقليل الانبعاثات", labelEn: "Emission Reduction" },
    { icon: "zap", value: "100%", labelAr: "أتمتة العمليات", labelEn: "Process Automation" },
  ],
};

export default function LandingPage() {
  const { saasConfig, addContactSubmission } = useStore();
  const isAr = saasConfig.language === "ar";
  const lp = saasConfig.landingPage;
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 800], [0, 200]);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // SEO meta tags
  useEffect(() => {
    if (!lp?.seo) return;
    const seo = lp.seo;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = saasConfig.language;
    const title = (isAr ? seo.metaTitleAr : seo.metaTitleEn);
    if (title) document.title = title;
    const setMeta = (name: string, content?: string) => {
      if (!content) return;
      let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("name", name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setMeta("description", isAr ? seo.metaDescAr : seo.metaDescEn);
    setMeta("keywords", isAr ? seo.keywordsAr : seo.keywordsEn);
  }, [isAr, lp?.seo, saasConfig.language]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(false);
    try {
      await addContactSubmission({
        name: sanitizeInput(form.name),
        company: sanitizeInput(form.company),
        email: sanitizeInput(form.email),
        phone: sanitizeInput(form.phone),
        subject: sanitizeInput(form.subject),
        message: sanitizeInput(form.message),
      });
      setSent(true);
      setForm({ name: "", company: "", email: "", phone: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 7000);
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  const resolvedServices = useMemo(
    () => (lp?.services || []),
    [lp]
  );
  const certifications = useMemo(() => lp?.certifications || [], [lp]);
  const whyChooseUs = useMemo(() => lp?.whyChooseUs || [], [lp]);
  const heroStats = useMemo(() => lp?.heroStats || [], [lp]);
  const trustBadges = useMemo(() => lp?.trustBadges || [], [lp]);
  const sc = useMemo(() => ({ ...DEFAULT_SC, ...((lp?.systemShowcase) || {}) }), [lp]);

  if (!lp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`bg-background font-sans selection:bg-primary-100 overflow-x-hidden transition-colors duration-500 ${isAr ? "text-right" : "text-left"}`}>
      <PublicNavbar isScrolled={isScrolled} setIsLoginModalOpen={setIsLoginModalOpen} />

      <AnimatePresence mode="wait">
        <motion.div
          key={saasConfig.language}
          initial={{ opacity: 0, x: isAr ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isAr ? -30 : 30 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* HERO */}
          <LandingHero
            isAr={isAr}
            lp={lp}
            yBg={yBg}
            trustBadges={trustBadges}
            heroStats={heroStats}
            scrollToSection={scrollToSection}
          />

          {/* CERTIFICATIONS BANNER */}
          <LandingCertifications isAr={isAr} certifications={certifications} getIcon={getIcon} />

          {/* ABOUT */}
          <LandingAbout isAr={isAr} lp={lp} />

          {/* SERVICES */}
          <LandingServices isAr={isAr} lp={lp} resolvedServices={resolvedServices} getIcon={getIcon} />

          {/* GCM-ERP SYSTEM SHOWCASE */}
          <section className="py-32 bg-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-125 h-125 bg-primary-500/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: isAr ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-8"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <BarChart3 size={14} /> {isAr ? sc.badgeAr : sc.badgeEn}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-text-main leading-tight">
                    {isAr ? sc.titleAr : sc.titleEn}
                  </h2>
                  <p className="text-text-subtle text-lg font-medium leading-relaxed">
                    {isAr ? sc.descAr : sc.descEn}
                  </p>
                  <div className="space-y-5">
                    {(sc.features || []).map((item: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(i, 8) * 0.04 }}
                        className="flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 shrink-0 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                          {scIcon(item.icon, 18, item.iconUrl)}
                        </div>
                        <p className="text-text-main font-semibold text-sm">{isAr ? item.textAr : item.textEn}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-2 gap-5"
                >
                  <div className="space-y-5 pt-10">
                    <div className="aspect-4/5 relative rounded-[2.5rem] bg-surface-subtle overflow-hidden border border-border shadow-xl">
                      {sc.imageTopUrl ? (
                        <Image src={sc.imageTopUrl} alt="Environment" fill className="object-cover" unoptimized />
                      ) : null}
                    </div>
                    <div className="p-6 bg-surface border border-border rounded-4xl text-center">
                      <div className="text-primary mb-2 flex justify-center">{scIcon(sc.stats?.[0]?.icon || "leaf", 28, sc.stats?.[0]?.iconUrl)}</div>
                      <p className="text-2xl font-black text-primary-600">{sc.stats?.[0]?.value}</p>
                      <p className="text-[9px] uppercase font-bold text-text-subtle tracking-widest mt-1">{isAr ? sc.stats?.[0]?.labelAr : sc.stats?.[0]?.labelEn}</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="p-6 bg-surface border border-border rounded-4xl text-center">
                      <div className="text-primary mb-2 flex justify-center">{scIcon(sc.stats?.[1]?.icon || "zap", 28, sc.stats?.[1]?.iconUrl)}</div>
                      <p className="text-2xl font-black text-primary-600">{sc.stats?.[1]?.value}</p>
                      <p className="text-[9px] uppercase font-bold text-text-subtle tracking-widest mt-1">{isAr ? sc.stats?.[1]?.labelAr : sc.stats?.[1]?.labelEn}</p>
                    </div>
                    <div className="aspect-4/5 rounded-[2.5rem] bg-surface-subtle overflow-hidden border border-border shadow-xl relative">
                      {sc.imageBottomUrl ? (
                        <Image src={sc.imageBottomUrl} alt="Technology" fill className="object-cover" unoptimized />
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* WHY CHOOSE US */}
          {whyChooseUs.length > 0 ? (
            <section className="py-32 bg-surface-subtle transition-colors overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-20"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Star size={14} /> {isAr ? "لماذا GCM؟" : "Why GCM?"}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-text-main mb-6">
                    {isAr ? "لماذا يختارنا كبار المطورين في المملكة؟" : "Why Leading Developers Choose Us?"}
                  </h2>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {whyChooseUs.map((item: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(i, 8) * 0.04 }}
                      className="flex gap-6 p-8 bg-surface rounded-4xl border border-border group hover:border-primary-500/20 hover:shadow-lg transition-all"
                    >
                      <div className="w-14 h-14 shrink-0 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-2xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                        <CheckCircle2 size={28} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-text-main mb-2">{isAr ? item.titleAr : item.titleEn}</h4>
                        <p className="text-text-subtle text-sm font-medium leading-relaxed">{isAr ? item.descAr : item.descEn}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* FLEET */}
          {lp.fleet && lp.fleet.length > 0 ? (
            <section id="fleet" className="py-32 bg-slate-900 text-white relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{isAr ? lp.fleetSectionTitleAr : lp.fleetSectionTitleEn}</h2>
                  <p className="text-slate-400 text-xl max-w-2xl">{isAr ? lp.fleetSectionDescAr : lp.fleetSectionDescEn}</p>
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {lp.fleet.map((f: any, idx: number) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(idx, 8) * 0.04 }}
                      key={f.id}
                      className={`bg-white/5 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center gap-8 group ${isAr ? "md:flex-row-reverse" : ""}`}
                    >
                      <div className="w-40 h-40 shrink-0 bg-white/5 rounded-4xl p-6 group-hover:scale-105 transition-transform duration-500">
                        {f.image ? (
                          <Image src={f.image} alt={isAr ? f.nameAr : f.nameEn} width={120} height={120} className="w-full h-full object-contain drop-shadow-2xl" unoptimized />
                        ) : null}
                      </div>
                      <div className={isAr ? "text-right" : "text-left"}>
                        <h4 className="text-2xl font-bold mb-3">{isAr ? f.nameAr : f.nameEn}</h4>
                        <p className="text-white/60 font-medium italic mb-4 leading-relaxed">"{isAr ? f.specsAr : f.specsEn}"</p>
                        <div className={`flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-widest ${isAr ? "justify-end" : ""}`}>
                          <CheckCircle2 size={14} /> Verified Asset
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* CARBON IMPACT */}
          <CarbonImpactSection isAr={isAr} config={lp.carbon} />

          {/* PARTNERS */}
          {lp.partners && lp.partners.length > 0 ? (
            <section className="py-20 bg-background border-y border-border transition-colors">
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <h4 className="text-center text-[10px] font-bold uppercase text-text-subtle tracking-[0.4em] mb-12">
                  {isAr ? lp.partnersSectionTitleAr : lp.partnersSectionTitleEn}
                </h4>
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-60 hover:opacity-100 transition-opacity">
                  {lp.partners.map((p: any) => (
                    <Image key={p.id} src={p.logo} alt={p.name} width={80} height={64} className="h-12 md:h-16 w-auto grayscale hover:grayscale-0 transition-all duration-500" title={p.name} unoptimized />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* CONTACT */}
          <LandingContact
            isAr={isAr}
            lp={lp}
            form={form}
            setForm={setForm}
            sent={sent}
            handleInquirySubmit={handleInquirySubmit}
          />

          <PublicFooter />
        </motion.div>
      </AnimatePresence>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
