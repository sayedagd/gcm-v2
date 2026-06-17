"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface Certification {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  iconUrl?: string;
}

interface LandingCertificationsProps {
  isAr: boolean;
  certifications: Certification[];
  getIcon: (type: string, url?: string) => React.ReactNode;
}

const LandingCertifications: React.FC<LandingCertificationsProps> = ({ isAr, certifications, getIcon }) => {
  if (certifications.length <= 0) return null;

  return (
    <section className="py-12 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-r from-primary-600/10 via-transparent to-emerald-600/10" />
      <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {certifications.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="flex items-center gap-5 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all"
            >
              <div className="w-14 h-14 shrink-0 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                {getIcon(cert.icon, cert.iconUrl)}
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
  );
};

export default LandingCertifications;
