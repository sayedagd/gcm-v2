"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, Building2, Truck, Clock, Target, Users } from 'lucide-react';

interface LandingAboutProps {
  isAr: boolean;
  lp: any;
}

const LandingAbout: React.FC<LandingAboutProps> = ({ isAr, lp }) => {
  return (
    <section id="about" className="py-32 bg-background transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: isAr ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Building2 size={14} /> {isAr ? lp.aboutTitleAr : lp.aboutTitleEn}
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-text-main">
            {isAr ? lp.aboutDescAr : lp.aboutDescEn}
          </h2>
          <p className="text-text-subtle text-lg font-medium leading-relaxed whitespace-pre-wrap">
            {isAr ? lp.aboutTextAr : lp.aboutTextEn}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
            {[
              { value: lp.experienceYears, label: isAr ? 'عاماً من الخبرة' : 'Years Experience', icon: Clock },
              { value: lp.projectsCount, label: isAr ? 'مشروع منجز' : 'Projects Done', icon: Target },
              { value: lp.clientsCount || '50+', label: isAr ? 'عميل نشط' : 'Active Clients', icon: Users },
              { value: lp.vehiclesCount || '120+', label: isAr ? 'مركبة عمليات' : 'Fleet Vehicles', icon: Truck },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-surface-subtle rounded-2xl border border-border">
                <item.icon size={20} className="mx-auto text-primary-500 mb-2" />
                <p className="text-2xl font-black text-primary-600">
                  {typeof item.value === 'number' ? `${item.value}+` : item.value}
                </p>
                <p className="text-[9px] font-bold text-text-subtle uppercase tracking-widest mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {lp.aboutImageUrl ? (
            <Image
              src={lp.aboutImageUrl}
              alt="About Us"
              width={600}
              height={600}
              className="rounded-[4rem] shadow-2xl aspect-square object-cover"
              unoptimized
            />
          ) : null}
          <div className={`absolute -bottom-8 ${isAr ? '-right-8' : '-left-8'} bg-primary-600 text-white p-8 rounded-4xl shadow-2xl shadow-primary-500/30 hidden md:flex flex-col gap-3 max-w-xs`}>
            <ShieldCheck size={32} className="mb-1" />
            <p className="text-sm font-bold leading-relaxed">{isAr ? lp.complianceTextAr : lp.complianceTextEn}</p>
          </div>
          {/* Decorative accent */}
          <div className={`absolute -top-6 ${isAr ? '-left-6' : '-right-6'} w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-4xl -z-10`} />
        </motion.div>
      </div>
    </section>
  );
};

export default LandingAbout;
