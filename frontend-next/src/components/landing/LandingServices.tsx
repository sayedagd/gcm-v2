"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

interface LandingServicesProps {
  isAr: boolean;
  lp: any;
  resolvedServices: any[];
  getIcon: (type: string, url?: string) => React.ReactNode;
}

const LandingServices: React.FC<LandingServicesProps> = ({ isAr, lp, resolvedServices, getIcon }) => {
  return (
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
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-text-main">
            {isAr ? lp.servicesSectionTitleAr : lp.servicesSectionTitleEn}
          </h2>
          <p className="text-text-subtle text-lg font-medium max-w-3xl mx-auto leading-relaxed">
            {isAr ? lp.servicesSectionDescAr : lp.servicesSectionDescEn}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resolvedServices.map((s: any, idx: number) => (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: Math.min(idx, 8) * 0.04, duration: 0.3 }}
              key={s.id || idx}
              className="bg-surface p-8 rounded-4xl border border-border group hover:border-primary-500/30 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-500 relative overflow-hidden"
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
  );
};

export default LandingServices;
