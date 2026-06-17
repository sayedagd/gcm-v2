"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, User, CheckCircle2, Mail, Phone, Building2, MapPin } from 'lucide-react';

interface ContactForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface LandingContactProps {
  isAr: boolean;
  lp: any;
  form: ContactForm;
  setForm: (form: ContactForm) => void;
  sent: boolean;
  handleInquirySubmit: (e: React.FormEvent) => void;
}

const LandingContact: React.FC<LandingContactProps> = ({ isAr, lp, form, setForm, sent, handleInquirySubmit }) => {
  return (
    <section id="contact" className="py-32 bg-background px-6 md:px-10 transition-colors relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: isAr ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
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
            {lp.contactRecipientEmail ? (
              <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center group-hover:bg-primary-600 transition-all">
                  <Mail size={20} className="text-primary-600 group-hover:text-white" />
                </div>
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="text-sm font-bold text-text-main">{lp.contactRecipientEmail}</p>
                </div>
              </div>
            ) : null}
            {lp.contactPhone ? (
              <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                  <Phone size={20} className="text-indigo-600 group-hover:text-white" />
                </div>
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'رقم الجوال' : 'Phone'}</p>
                  <p className="text-sm font-bold text-text-main">{lp.contactPhone}</p>
                </div>
              </div>
            ) : null}
            {(lp.contactLocationAr || lp.contactLocationEn) ? (
              <div className={`flex items-center gap-5 p-5 bg-surface rounded-2xl border border-border group hover:border-primary-500/20 transition-all ${isAr ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-all">
                  <MapPin size={20} className="text-emerald-600 group-hover:text-white" />
                </div>
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الموقع' : 'Location'}</p>
                  <p className="text-sm font-bold text-text-main">{isAr ? (lp.contactLocationAr || '') : (lp.contactLocationEn || '')}</p>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute -top-4 -right-4 -left-4 -bottom-4 bg-linear-to-br from-primary-500/20 via-emerald-500/10 to-transparent rounded-[3.5rem] blur-xl" />
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
                  <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                    {isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-rose-500">*</span>
                  </label>
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
                  <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                    {isAr ? 'البريد الإلكتروني' : 'Email'} <span className="text-rose-500">*</span>
                  </label>
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
                {lp.showCompanyField !== false ? (
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
                ) : null}
                {lp.showPhoneField !== false ? (
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
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">
                  {isAr ? 'رسالتك' : 'Your Message'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
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
                      ? 'تم استلام طلبك وسيتم التواصل معك في أقرب وقت'
                      : 'Message received! We will contact you shortly'}
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
  );
};

export default LandingContact;
