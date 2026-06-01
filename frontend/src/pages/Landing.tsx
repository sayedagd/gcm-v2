
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/context';
import { useBranding } from '@/store';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Recycle, Truck, Droplets,
  ArrowRight, Globe, User, CheckCircle2, Award, Mail, Zap, Factory, Settings,
  Facebook, Twitter, Linkedin, Instagram, Activity, Lock, Key, Youtube, MessageSquare,
  Phone, Building2, Leaf, Target, BarChart3, Users, MapPin, Clock, Star, ChevronDown
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { LoginModal } from '@/components/layout/LoginModal';
import { CarbonImpactSection } from '@/components';

// --- Native XSS Sanitizer Utility ---
const sanitizeInput = (input: string) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
};

// --- Animated Counter ---
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }: { end: string; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const numericEnd = parseInt(end.replace(/[^0-9]/g, ''));
  
  useEffect(() => {
    if (isNaN(numericEnd)) return;
    let start = 0;
    const step = Math.ceil(numericEnd / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= numericEnd) {
        setCount(numericEnd);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [numericEnd, duration]);

  if (end === '24/7') return <span>24/7</span>;
  return <span>{end.startsWith('+') ? '+' : ''}{count}{suffix}</span>;
};

const Landing: React.FC = () => {
  const { saasConfig, updateSaaS, addContactSubmission, login, addPermissionRequest, darkMode, setDarkMode } = useStore();
  useBranding(saasConfig, darkMode);
  const navigate = useNavigate();
  const isAr = saasConfig.language === 'ar';
  const lp = saasConfig.landingPage;
  const { scrollY } = useScroll();

  if (!lp || !lp.seo) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;

  const yBg = useTransform(scrollY, [0, 800], [0, 200]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = saasConfig.language;
    document.title = isAr ? lp.seo.metaTitleAr : lp.seo.metaTitleEn;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', isAr ? lp.seo.metaDescAr : lp.seo.metaDescEn);
    if (lp.seo.googleAnalyticsId && !window.gaInitialized) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${lp.seo.googleAnalyticsId}`;
      script.async = true;
      document.head.appendChild(script);
      const inlineScript = document.createElement('script');
      inlineScript.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${lp.seo.googleAnalyticsId}');`;
      document.head.appendChild(inlineScript);
      window.gaInitialized = true;
    }
  }, [isAr, lp.seo, saasConfig.language]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getPortalIcon = (type: string) => {
    switch (type) {
      case 'shield': return <ShieldCheck size={18} />;
      case 'lock': return <Lock size={18} />;
      case 'zap': return <Zap size={18} />;
      case 'key': return <Key size={18} />;
      default: return <User size={18} />;
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook size={20} />;
      case 'twitter': return <Twitter size={20} />;
      case 'linkedin': return <Linkedin size={20} />;
      case 'instagram': return <Instagram size={20} />;
      case 'youtube': return <Youtube size={20} />;
      case 'whatsapp': return <MessageSquare size={20} />;
      default: return <Globe size={20} />;
    }
  };

  const getIcon = (type: string, url?: string) => {
    if (type === 'custom' && url) return <img src={url} className="w-full h-full object-contain p-2" />;
    switch (type) {
      case 'truck': return <Truck size={32} />;
      case 'shield': return <ShieldCheck size={32} />;
      case 'recycle': return <Recycle size={32} />;
      case 'droplet': return <Droplets size={32} />;
      case 'factory': return <Factory size={32} />;
      case 'settings': return <Settings size={32} />;
      case 'globe': return <Globe size={32} />;
      default: return <Activity size={32} />;
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(false); // Reset in case of multiple attempts
    try {
      const cleanForm = {
        name: sanitizeInput(form.name),
        company: sanitizeInput(form.company),
        email: sanitizeInput(form.email),
        phone: sanitizeInput(form.phone),
        subject: sanitizeInput(form.subject),
        message: sanitizeInput(form.message),
      };
      await addContactSubmission({ ...cleanForm });
      setSent(true);
      setForm({ name: '', company: '', email: '', phone: '', subject: '', message: '' });
      // Keep message visible for longer (7 seconds)
      setTimeout(() => setSent(false), 7000);
    } catch (err) {
      console.error("Submission failed:", err);
      // Optional: Add error state if desired, but user specifically asked for success path
    }
  };

  // Resolve services: use user-defined services if available, otherwise use defaultServices
  const resolvedServices = (lp.services && lp.services.length > 0) ? lp.services : (lp.defaultServices || []);
  const certifications = lp.certifications || [];
  const whyChooseUs = lp.whyChooseUs || [];
  const heroStats = lp.heroStats || [];
  const trustBadges = lp.trustBadges || [];

  return (
    <div className={`bg-background font-sans selection:bg-primary-100 overflow-x-hidden transition-colors duration-500 ${isAr ? 'text-right' : 'text-left'}`}>

      {/* Script Injection: Header */}
      {lp.seo.headerScripts && <div dangerouslySetInnerHTML={{ __html: lp.seo.headerScripts }} />}
      {lp.seo.bodyScripts && <div dangerouslySetInnerHTML={{ __html: lp.seo.bodyScripts }} />}

      <PublicNavbar isScrolled={isScrolled} setIsLoginModalOpen={setIsLoginModalOpen} />

      <AnimatePresence mode="wait">
        <motion.div
          key={saasConfig.language}
          initial={{ opacity: 0, x: isAr ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isAr ? -30 : 30 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ============================================ */}
          {/* HERO SECTION — Premium Full-Screen with Stats */}
          {/* ============================================ */}
          <section className="relative min-h-screen flex items-center overflow-hidden">
            <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 scale-110">
              <img src={lp.heroBgUrl} className="w-full h-full object-cover" fetchPriority="high" loading="eager" decoding="sync" alt="Hero Background" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
            </motion.div>

            {/* Decorative Elements */}
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full pt-32 pb-20">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                {/* Trust Badges */}
                <div className={`flex flex-wrap gap-3 mb-8 ${isAr ? 'justify-end' : 'justify-start'}`}>
                  {trustBadges.map((badge, i) => (
                    <div key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white/90 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                      <ShieldCheck size={12} className="text-primary-400" />
                      {isAr ? badge.labelAr : badge.labelEn}
                    </div>
                  ))}
                </div>

                <h1 className="text-5xl md:text-7xl xl:text-8xl font-bold text-white leading-[1.1] tracking-tight mb-8 max-w-5xl">
                  {isAr ? lp.heroTitleAr : lp.heroTitleEn}
                </h1>
                <p className="text-lg md:text-xl text-white/70 max-w-2xl font-medium leading-relaxed mb-12">
                  {isAr ? lp.heroDescAr : lp.heroDescEn}
                </p>

                <div className={`flex flex-wrap gap-4 mb-16 ${isAr ? 'justify-end' : 'justify-start'}`}>
                  <button onClick={() => scrollToSection('contact')} className="px-10 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-primary-600/30 flex items-center gap-3 active:scale-95 transition-all group">
                    {isAr ? 'اطلب استشارة مجانية' : 'Get Free Consultation'}
                    <ArrowRight size={20} className={`${isAr ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform`} />
                  </button>
                  <button onClick={() => scrollToSection('services')} className="px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold text-sm border border-white/20 flex items-center gap-3 active:scale-95 transition-all">
                    {isAr ? 'تعرف على خدماتنا' : 'Explore Services'}
                  </button>
                </div>

                {/* Hero Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {heroStats.map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center group hover:bg-white/10 transition-all"
                    >
                      <div className="text-3xl md:text-4xl font-black text-white mb-1">
                        <AnimatedCounter end={isAr ? stat.valueAr : stat.valueEn} />
                      </div>
                      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        {isAr ? stat.labelAr : stat.labelEn}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
            >
              <ChevronDown size={32} className="text-white/40" />
            </motion.div>
          </section>

          {/* ============================================ */}
          {/* CERTIFICATIONS BANNER */}
          {/* ============================================ */}
          {certifications.length > 0 && (
            <section className="py-12 bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-emerald-600/10" />
              <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {certifications.map((cert, i) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-5 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all"
                    >
                      <div className="w-14 h-14 shrink-0 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                        {getIcon(cert.icon)}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm mb-1">{isAr ? cert.nameAr : cert.nameEn}</h4>
                        <p className="text-slate-400 text-xs font-medium">{isAr ? cert.descAr : cert.descEn}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* ABOUT SECTION */}
          {/* ============================================ */}
          <section id="about" className="py-32 bg-background transition-colors overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: isAr ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <Building2 size={14} /> {isAr ? lp.aboutTitleAr : lp.aboutTitleEn}
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-text-main">{isAr ? lp.aboutDescAr : lp.aboutDescEn}</h2>
                <p className="text-text-subtle text-lg font-medium leading-relaxed whitespace-pre-wrap">{isAr ? lp.aboutTextAr : lp.aboutTextEn}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                  {[
                    { value: lp.experienceYears, label: isAr ? 'عاماً من الخبرة' : 'Years Experience', icon: Clock },
                    { value: lp.projectsCount, label: isAr ? 'مشروع منجز' : 'Projects Done', icon: Target },
                    { value: lp.clientsCount || '50+', label: isAr ? 'عميل نشط' : 'Active Clients', icon: Users },
                    { value: lp.vehiclesCount || '120+', label: isAr ? 'مركبة عمليات' : 'Fleet Vehicles', icon: Truck },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 bg-surface-subtle rounded-2xl border border-border">
                      <item.icon size={20} className="mx-auto text-primary-500 mb-2" />
                      <p className="text-2xl font-black text-primary-600">{typeof item.value === 'number' ? `${item.value}+` : item.value}</p>
                      <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <img src={lp.aboutImageUrl} className="rounded-[4rem] shadow-2xl aspect-square object-cover" loading="lazy" fetchPriority="low" alt="About Us" />
                <div className={`absolute -bottom-8 ${isAr ? '-right-8' : '-left-8'} bg-primary-600 text-white p-8 rounded-[2rem] shadow-2xl shadow-primary-500/30 hidden md:flex flex-col gap-3 max-w-xs`}>
                  <ShieldCheck size={32} className="mb-1" />
                  <p className="text-sm font-bold leading-relaxed">{isAr ? lp.complianceTextAr : lp.complianceTextEn}</p>
                </div>
                {/* Decorative accent */}
                <div className={`absolute -top-6 ${isAr ? '-left-6' : '-right-6'} w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-[2rem] -z-10`} />
              </motion.div>
            </div>
          </section>

          {/* ============================================ */}
          {/* SERVICES SECTION — Premium Grid */}
          {/* ============================================ */}
          <section id="services" className="py-32 bg-surface-subtle transition-colors scroll-mt-28">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                  <Leaf size={14} /> {isAr ? 'خدماتنا' : 'Our Services'}
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-text-main">{isAr ? lp.servicesSectionTitleAr : lp.servicesSectionTitleEn}</h2>
                <p className="text-text-subtle text-lg font-medium max-w-3xl mx-auto leading-relaxed">{isAr ? lp.servicesSectionDescAr : lp.servicesSectionDescEn}</p>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {resolvedServices.map((s, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                    key={s.id || idx}
                    className="bg-surface p-8 rounded-[2rem] border border-border group hover:border-primary-500/30 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-500 relative overflow-hidden"
                  >
                    {/* Hover glow */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-6 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                        {getIcon(s.iconType, s.iconUrl)}
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-text-main">{isAr ? s.titleAr : s.titleEn}</h3>
                      <p className="text-text-subtle font-medium text-sm leading-relaxed">{isAr ? s.descAr : s.descEn}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================ */}
          {/* GCM-ERP SYSTEM SHOWCASE */}
          {/* ============================================ */}
          <section className="py-32 bg-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: isAr ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-8"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <BarChart3 size={14} /> {isAr ? 'نظام GCM-ERP' : 'GCM-ERP System'}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-text-main leading-tight">
                    {isAr ? 'نظام ذكي يخدم عملياتكم البيئية' : 'Smart System Powering Your Environmental Operations'}
                  </h2>
                  <p className="text-text-subtle text-lg font-medium leading-relaxed">
                    {isAr 
                      ? 'نظام GCM-ERP هو منصة رقمية متكاملة صُممت خصيصاً لإدارة عمليات النفايات والخدمات البيئية. يتيح للعملاء متابعة لحظية لكل رحلة نقل، وبيانات الوزن، وشهادات التخلص، مع تقارير تحليلية تلقائية تدعم اتخاذ القرار.'
                      : 'GCM-ERP is an integrated digital platform specifically designed for managing waste operations and environmental services. It enables clients to track every transport trip in real-time, monitor weight data, disposal certificates, and receive automated analytical reports for data-driven decision making.'
                    }
                  </p>

                  <div className="space-y-5">
                    {[
                      { icon: MapPin, tAr: 'تتبع GPS لحظي لكل رحلة نقل', tEn: 'Real-time GPS tracking for every transport trip' },
                      { icon: BarChart3, tAr: 'تقارير تحليلية وإحصاءات تلقائية', tEn: 'Automated analytical reports and statistics' },
                      { icon: ShieldCheck, tAr: 'بيانات وزن وشهادات تخلص معتمدة', tEn: 'Certified weight data and disposal certificates' },
                      { icon: Users, tAr: 'بوابة عملاء مخصصة وآمنة', tEn: 'Dedicated and secure client portal' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-center gap-4 group"
                      >
                        <div className="w-10 h-10 shrink-0 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                          <item.icon size={18} />
                        </div>
                        <p className="text-text-main font-semibold text-sm">{isAr ? item.tAr : item.tEn}</p>
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
                    <div className="aspect-[4/5] rounded-[2.5rem] bg-surface-subtle overflow-hidden border border-border shadow-xl">
                      <img src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80" className="w-full h-full object-cover" loading="lazy" alt="Environment" />
                    </div>
                    <div className="p-6 bg-surface border border-border rounded-[2rem] text-center">
                      <Leaf size={28} className="mx-auto text-emerald-500 mb-2" />
                      <p className="text-2xl font-black text-emerald-600">80%</p>
                      <p className="text-[9px] uppercase font-bold text-text-subtle tracking-widest mt-1">{isAr ? 'تقليل الانبعاثات' : 'Emission Reduction'}</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="p-6 bg-surface border border-border rounded-[2rem] text-center">
                      <Zap size={28} className="mx-auto text-indigo-500 mb-2" />
                      <p className="text-2xl font-black text-indigo-600">100%</p>
                      <p className="text-[9px] uppercase font-bold text-text-subtle tracking-widest mt-1">{isAr ? 'أتمتة العمليات' : 'Process Automation'}</p>
                    </div>
                    <div className="aspect-[4/5] rounded-[2.5rem] bg-surface-subtle overflow-hidden border border-border shadow-xl">
                      <img src="https://images.unsplash.com/photo-1541888941255-658066889e40?auto=format&fit=crop&q=80" className="w-full h-full object-cover" loading="lazy" alt="Technology" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ============================================ */}
          {/* WHY CHOOSE US */}
          {/* ============================================ */}
          {whyChooseUs.length > 0 && (
            <section className="py-32 bg-surface-subtle transition-colors overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-20"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Star size={14} /> {isAr ? 'لماذا GCM؟' : 'Why GCM?'}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-text-main mb-6">
                    {isAr ? 'لماذا يختارنا كبار المطورين في المملكة؟' : 'Why Leading Developers Choose Us?'}
                  </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {whyChooseUs.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-6 p-8 bg-surface rounded-[2rem] border border-border group hover:border-primary-500/20 hover:shadow-lg transition-all"
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
          )}

          {/* ============================================ */}
          {/* FLEET SECTION */}
          {/* ============================================ */}
          {lp.fleet && lp.fleet.length > 0 && (
            <section id="fleet" className="py-32 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute inset-0 sadu-bg opacity-5" />
              <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-20">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{isAr ? lp.fleetSectionTitleAr : lp.fleetSectionTitleEn}</h2>
                  <p className="text-slate-400 text-xl max-w-2xl">{isAr ? lp.fleetSectionDescAr : lp.fleetSectionDescEn}</p>
                </motion.div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {lp.fleet.map((f, idx) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      key={f.id}
                      className={`bg-white/5 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center gap-8 group ${isAr ? 'md:flex-row-reverse' : ''}`}
                    >
                      <div className="w-40 h-40 shrink-0 bg-white/5 rounded-[2rem] p-6 group-hover:scale-105 transition-transform duration-500">
                        <img src={f.image} className="w-full h-full object-contain drop-shadow-2xl" loading="lazy" alt={isAr ? f.nameAr : f.nameEn} />
                      </div>
                      <div className={isAr ? 'text-right' : 'text-left'}>
                        <h4 className="text-2xl font-bold mb-3">{isAr ? f.nameAr : f.nameEn}</h4>
                        <p className="text-white/60 font-medium italic mb-4 leading-relaxed">"{isAr ? f.specsAr : f.specsEn}"</p>
                        <div className={`flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-widest ${isAr ? 'justify-end' : ''}`}>
                          <CheckCircle2 size={14} /> Verified Asset
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* CARBON IMPACT */}
          {/* ============================================ */}
          <CarbonImpactSection isAr={isAr} config={lp.carbon} />

          {/* ============================================ */}
          {/* PARTNERS */}
          {/* ============================================ */}
          {lp.partners && lp.partners.length > 0 && (
            <section className="py-20 bg-background border-y border-border transition-colors">
              <div className="max-w-7xl mx-auto px-6 md:px-10">
                <h4 className="text-center text-[10px] font-bold uppercase text-text-subtle tracking-[0.4em] mb-12">{isAr ? lp.partnersSectionTitleAr : lp.partnersSectionTitleEn}</h4>
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-60 hover:opacity-100 transition-opacity">
                  {lp.partners.map(p => (
                    <img key={p.id} src={p.logo} alt={p.name} className="h-12 md:h-16 w-auto grayscale hover:grayscale-0 transition-all duration-500" title={p.name} loading="lazy" />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ============================================ */}
          {/* CONTACT SECTION — Premium Form */}
          {/* ============================================ */}
          <section id="contact" className="py-32 bg-background px-6 md:px-10 transition-colors relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <motion.div initial={{ opacity: 0, x: isAr ? 50 : -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <Mail size={14} /> {isAr ? 'تواصل معنا' : 'Contact Us'}
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-text-main">
                  {isAr ? (lp.contactTitleAr || 'هل لديك مشروع؟ تواصل معنا') : (lp.contactTitleEn || 'Have a Project? Get in Touch')}
                </h2>
                <p className="text-text-subtle text-lg font-medium leading-relaxed">
                  {isAr ? (lp.contactDescAr || 'فريقنا جاهز لتقديم استشارة فنية لمشروعكم') : (lp.contactDescEn || 'Our team is ready to provide consultation for your project.')}
                </p>

                {/* Contact Info Cards */}
                <div className="space-y-4">
                  {lp.contactRecipientEmail && (
                    <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center group-hover:bg-primary-600 transition-all">
                        <Mail size={20} className="text-primary-600 group-hover:text-white" />
                      </div>
                      <div className={isAr ? 'text-right' : 'text-left'}>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'البريد الإلكتروني' : 'Email'}</p>
                        <p className="text-sm font-bold text-text-main">{lp.contactRecipientEmail}</p>
                      </div>
                    </div>
                  )}
                  {lp.contactPhone && (
                    <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                        <Phone size={20} className="text-indigo-600 group-hover:text-white" />
                      </div>
                      <div className={isAr ? 'text-right' : 'text-left'}>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم الجوال' : 'Phone'}</p>
                        <p className="text-sm font-bold text-text-main direction-ltr">{lp.contactPhone}</p>
                      </div>
                    </div>
                  )}
                  {(lp.contactLocationAr || lp.contactLocationEn) && (
                    <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-all">
                        <MapPin size={20} className="text-emerald-600 group-hover:text-white" />
                      </div>
                      <div className={isAr ? 'text-right' : 'text-left'}>
                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الموقع' : 'Location'}</p>
                        <p className="text-sm font-bold text-text-main">{isAr ? (lp.contactLocationAr || '') : (lp.contactLocationEn || '')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute -top-4 -right-4 -left-4 -bottom-4 bg-gradient-to-br from-primary-500/20 via-emerald-500/10 to-transparent rounded-[3.5rem] blur-xl" />
                <div className="relative bg-surface p-10 md:p-12 rounded-[3rem] shadow-2xl border border-border overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <h3 className="text-2xl font-bold text-text-main mb-2">
                    {isAr ? 'أرسل لنا رسالتك' : 'Send Us a Message'}
                  </h3>
                  <p className="text-text-subtle text-sm mb-8">
                    {isAr ? 'سنرد عليك خلال 24 ساعة عمل' : "We'll respond within 24 business hours"}
                  </p>

                  <form onSubmit={handleInquirySubmit} className="space-y-5 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الاسم الكامل' : 'Full Name'} *</label>
                        <div className="relative">
                          <User size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-subtle ${isAr ? 'right-4' : 'left-4'}`} />
                          <input
                            placeholder={isAr ? 'محمد أحمد' : 'John Doe'}
                            required
                            className={`w-full p-4 ${isAr ? 'pr-11' : 'pl-11'} bg-surface-subtle border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-2xl outline-none font-semibold text-sm text-text-main transition-all ${isAr ? 'text-right' : 'text-left'}`}
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'البريد الإلكتروني' : 'Email'} *</label>
                        <div className="relative">
                          <Mail size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-subtle ${isAr ? 'right-4' : 'left-4'}`} />
                          <input
                            placeholder="email@company.com"
                            type="email"
                            required
                            className={`w-full p-4 ${isAr ? 'pr-11' : 'pl-11'} bg-surface-subtle border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-2xl outline-none font-semibold text-sm text-text-main transition-all ${isAr ? 'text-right' : 'text-left'}`}
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {lp.showCompanyField !== false && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'اسم الشركة' : 'Company'}</label>
                          <div className="relative">
                            <Building2 size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-subtle ${isAr ? 'right-4' : 'left-4'}`} />
                            <input
                              placeholder={isAr ? 'شركة ...' : 'Company name'}
                              className={`w-full p-4 ${isAr ? 'pr-11' : 'pl-11'} bg-surface-subtle border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-2xl outline-none font-semibold text-sm text-text-main transition-all ${isAr ? 'text-right' : 'text-left'}`}
                              value={form.company}
                              onChange={e => setForm({ ...form, company: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      {lp.showPhoneField !== false && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم الجوال' : 'Phone'}</label>
                          <div className="relative">
                            <Phone size={16} className={`absolute top-1/2 -translate-y-1/2 text-text-subtle ${isAr ? 'right-4' : 'left-4'}`} />
                            <input
                              placeholder="+966 5xx xxx xxxx"
                              type="tel"
                              className={`w-full p-4 ${isAr ? 'pr-11' : 'pl-11'} bg-surface-subtle border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-2xl outline-none font-semibold text-sm text-text-main transition-all ${isAr ? 'text-right' : 'text-left'}`}
                              value={form.phone}
                              onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رسالتك' : 'Your Message'} *</label>
                      <textarea
                        placeholder={isAr ? 'اكتب رسالتك هنا... (نوع الخدمة المطلوبة، تفاصيل المشروع، إلخ)' : 'Write your message here... (type of service needed, project details, etc.)'}
                        required
                        className={`w-full p-4 bg-surface-subtle border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-2xl outline-none font-semibold text-sm h-36 text-text-main transition-all resize-none ${isAr ? 'text-right' : 'text-left'}`}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sent}
                      className={`w-full py-5 rounded-2xl font-bold text-base shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all ${
                        sent
                          ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                          : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-500/20'
                      }`}
                    >
                      {sent ? (
                        <>
                          <CheckCircle2 size={22} />
                          {isAr 
                            ? 'استلمنا طلبك وهيتم مراجعته في أسرع وقت والتواصل وحل أي مشكلة' 
                            : 'We have received your request and it will be reviewed as soon as possible, and we will contact you to solve any problem'}
                        </>
                      ) : (
                        <>
                          <Mail size={20} />
                          {isAr ? 'إرسال الرسالة' : 'Send Message'}
                          <ArrowRight size={18} className={isAr ? 'rotate-180' : ''} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          </section>

          <PublicFooter />
        </motion.div>
      </AnimatePresence>

      {/* Script Injection: Footer */}
      {lp.seo.footerScripts && <div dangerouslySetInnerHTML={{ __html: lp.seo.footerScripts }} />}

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

    </div>
  );
};

export default Landing;
