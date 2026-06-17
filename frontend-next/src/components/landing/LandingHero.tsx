"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, ChevronDown } from 'lucide-react';

// --- Animated Counter ---
const AnimatedCounter = ({ end, duration = 2000 }: { end: string; duration?: number }) => {
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
  return <span>{end.startsWith('+') ? '+' : ''}{count}</span>;
};

interface HeroStat {
  valueAr: string;
  valueEn: string;
  labelAr: string;
  labelEn: string;
}

interface TrustBadge {
  labelAr: string;
  labelEn: string;
}

interface LandingHeroProps {
  isAr: boolean;
  lp: any;
  yBg?: any;
  trustBadges: TrustBadge[];
  heroStats: HeroStat[];
  scrollToSection: (id: string) => void;
}

const LandingHero: React.FC<LandingHeroProps> = ({ isAr, lp, trustBadges, heroStats, scrollToSection }) => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0 scale-110">
        {lp.heroBgUrl ? (
          <Image
            src={lp.heroBgUrl}
            alt="Hero Background"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-background" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
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
            <button
              onClick={() => scrollToSection('contact')}
              className="px-10 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-primary-600/30 flex items-center gap-3 active:scale-95 transition-all group"
            >
              {isAr ? 'اطلب استشارة مجانية' : 'Get Free Consultation'}
              <ArrowRight size={20} className={`${isAr ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform`} />
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold text-sm border border-white/20 flex items-center gap-3 active:scale-95 transition-all"
            >
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
                transition={{ delay: 0.15 + Math.min(i, 8) * 0.04 }}
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
  );
};

export default LandingHero;
