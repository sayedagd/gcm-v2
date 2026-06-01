
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/context';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ShoppingBag, ArrowRight, Eye,
    X, Mail, Phone, Building2, User, Send, CheckCircle2, MessageSquare,
    Package, Activity, Share2, Download, File as FileIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { LoginModal } from '@/components/layout/LoginModal';
import { toast } from '@/utils/toast';

const Store: React.FC = () => {
    const navigate = useNavigate();
    const { environmentalEquipments, saasConfig, submitEquipmentInquiry, shareEquipment, darkMode, api, setEnvironmentalEquipments } = useStore();
    const isAr = saasConfig.language === 'ar';
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [activeImage, setActiveImage] = useState<string>('');
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [inquirySent, setInquirySent] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const publicFetchDone = useRef(false);

    // [AR] جلب الأجهزة للزوار بدون تسجيل دخول — الـ loadAllData لا يعمل إلا بعد اللوجين
    // [EN] Fetch equipment for public visitors — loadAllData only runs after login
    useEffect(() => {
        if (publicFetchDone.current) return;
        publicFetchDone.current = true;
        api.getEquipments().then((d: any) => {
            if (Array.isArray(d) && d.length > 0) setEnvironmentalEquipments(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedProduct) setActiveImage(selectedProduct.image_url);
    }, [selectedProduct]);

    const handleShare = async (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        const shareData = {
            title: isAr ? product.name_ar : product.name_en,
            text: isAr ? product.description_ar : product.description_en,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                shareEquipment(product.equipment_id);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied to clipboard');
                shareEquipment(product.equipment_id);
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filtered = environmentalEquipments.filter(e =>
        (isAr ? e.name_ar : e.name_en).toLowerCase().includes(search.toLowerCase())
    );

    const handleInquiry = (e: React.FormEvent) => {
        e.preventDefault();
        submitEquipmentInquiry({
            ...form,
            customer_name: form.name,
            equipment_id: selectedProduct.equipment_id,
            product_name_snapshot: isAr ? selectedProduct.name_ar : selectedProduct.name_en,
            timestamp: new Date().toISOString()
        });
        setInquirySent(true);
        setTimeout(() => {
            setInquirySent(false);
            setShowInquiryForm(false);
            setForm({ name: '', email: '', phone: '', company: '', message: '' });
        }, 3000);
    };

    return (
        <div className={`min-h-screen bg-background font-sans selection:bg-primary-100 overflow-x-hidden transition-colors duration-500 ${isAr ? 'text-right' : 'text-left'}`}>
            <PublicNavbar isScrolled={isScrolled} setIsLoginModalOpen={setIsLoginModalOpen} />

            <AnimatePresence mode="wait">
                <motion.div
                    key={saasConfig.language}
                    initial={{ opacity: 0, x: isAr ? 30 : -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isAr ? -30 : 30 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Header / Hero Section */}
                    <div className="relative pt-32 pb-20 px-6 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-20 right-20 w-96 h-96 bg-primary-500 rounded-full blur-[150px]" />
                            <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-500 rounded-full blur-[120px]" />
                        </div>

                        <div className="max-w-7xl mx-auto relative z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center md:text-start"
                            >
                                <h1 className="text-4xl md:text-7xl font-bold text-text-main tracking-tight mb-6">
                                    {isAr ? saasConfig.storePage?.heroTitleAr || 'متجر الأجهزة البيئية' : saasConfig.storePage?.heroTitleEn || 'Environmental Equipment Store'}
                                </h1>
                                <p className="text-text-subtle text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                                    {isAr
                                        ? saasConfig.storePage?.heroDescAr || 'نقدم أحدث الحلول والتقنيات العالمية لرصد وحماية البيئة. حلول متكاملة تناسب احتياجات منشآتكم.'
                                        : saasConfig.storePage?.heroDescEn || 'Providing the latest global solutions and technologies for environmental monitoring and protection.'}
                                </p>
                            </motion.div>

                            {/* Search & Filter Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-12 flex flex-col md:flex-row gap-4"
                            >
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary-500 transition-colors" size={20} />
                                    <input
                                        placeholder={isAr ? 'ابحث عن جهاز...' : 'Search for equipment...'}
                                        className={`w-full py-5 ${isAr ? 'pr-6 pl-14 text-right' : 'pl-14 pr-6'} bg-surface/80 border border-border rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold`}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <button className="px-8 py-5 glass border border-border rounded-2xl font-bold flex items-center justify-center gap-3 text-text-main hover:bg-surface transition-all">
                                    <Filter size={20} />
                                    {isAr ? 'تصفية' : 'Filter'}
                                </button>
                            </motion.div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="max-w-7xl mx-auto px-6 pb-40">
                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filtered.map((item, idx) => (
                                    <motion.div
                                        key={item.equipment_id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group relative bg-surface border border-border rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 flex flex-col cursor-pointer"
                                        onClick={() => setSelectedProduct(item)}
                                    >
                                        <div className="aspect-[4/3] bg-surface-subtle overflow-hidden relative">
                                            <img
                                                src={item.image_url || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80'}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt={isAr ? item.name_ar : item.name_en}
                                            />
                                            <div className="absolute top-5 right-5">
                                                <div className="px-4 py-2 glass border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md">
                                                    {item.status || 'AVAILABLE'}
                                                </div>
                                            </div>
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="p-4 bg-white text-primary-600 rounded-full scale-50 group-hover:scale-100 transition-transform">
                                                    <Eye size={24} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col">
                                            <h3 className="text-xl font-bold text-text-main mb-3 group-hover:text-primary-500 transition-colors">
                                                {isAr ? item.name_ar : item.name_en}
                                            </h3>
                                            <p className="text-text-subtle text-sm font-medium line-clamp-2 mb-6">
                                                {isAr ? item.description_ar : item.description_en}
                                            </p>
                                            <div className="mt-auto flex items-center justify-between border-t border-border pt-6">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">
                                                        {isAr ? 'عرض التفاصيل' : 'See Details'}
                                                    </span>
                                                    {(item.share_count > 0) && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-text-subtle opacity-60">
                                                            <Share2 size={10} />
                                                            {item.share_count}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => handleShare(e, item)}
                                                        className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-text-subtle hover:bg-primary-50 hover:text-primary-600 transition-all"
                                                    >
                                                        <Share2 size={18} />
                                                    </button>
                                                    <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-text-subtle group-hover:bg-primary-600 group-hover:text-white transition-all">
                                                        <ArrowRight size={18} className={isAr ? 'rotate-180' : ''} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <Package size={64} className="mx-auto text-text-subtle opacity-20 mb-6" />
                                <h3 className="text-2xl font-bold text-text-main mb-2">{isAr ? 'لم يتم العثور على أجهزة' : 'No equipment found'}</h3>
                                <p className="text-text-subtle font-medium">{isAr ? 'حاول استخدام كلمات بحث أخرى' : 'Try using different search terms'}</p>
                            </div>
                        )}
                    </div>

                    {/* Product Detail Modal */}
                    <AnimatePresence>
                        {selectedProduct && (
                            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedProduct(null)}
                                    className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                                />
                                <motion.div
                                    layoutId={selectedProduct.equipment_id}
                                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                                    className="bg-surface w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-[1001] border border-border overflow-hidden flex flex-col md:flex-row"
                                >
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className={`absolute top-8 ${isAr ? 'left-8' : 'right-8'} p-4 bg-surface-subtle hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all z-20`}
                                    >
                                        <X size={24} />
                                    </button>

                                    {/* Image Section (Carousel) */}
                                    <div className="w-full md:w-1/2 bg-surface-subtle relative h-[400px] md:h-auto flex flex-col">
                                        <div className="flex-1 relative overflow-hidden">
                                            <AnimatePresence mode="wait">
                                                <motion.img
                                                    key={activeImage}
                                                    src={activeImage || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80'}
                                                    initial={{ opacity: 0, scale: 1.1 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.4 }}
                                                    className="w-full h-full object-cover"
                                                />
                                            </AnimatePresence>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />
                                        </div>

                                        {/* Thumbnails */}
                                        {(selectedProduct.additional_images?.length > 0) && (
                                            <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar bg-surface/50 backdrop-blur-md">
                                                {[selectedProduct.image_url, ...selectedProduct.additional_images].filter(Boolean).map((imgValue: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveImage(imgValue)}
                                                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeImage === imgValue ? 'border-primary-500 scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                    >
                                                        <img src={imgValue} className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Section */}
                                    <div className="w-full md:w-1/2 p-8 md:p-14 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-8">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary-500/20">
                                                <Activity size={14} /> {isAr ? 'تقنية حيوية' : 'Biosciences'}
                                            </div>
                                            <h2 className="text-4xl md:text-5xl font-bold text-text-main leading-none uppercase tracking-tight">
                                                {isAr ? selectedProduct.name_ar : selectedProduct.name_en}
                                            </h2>
                                            <p className="text-text-subtle text-lg font-medium leading-relaxed whitespace-pre-wrap border-l-4 border-primary-500 pl-6 py-2">
                                                {isAr ? selectedProduct.description_ar : selectedProduct.description_en}
                                            </p>

                                            {/* Specifications & Documents */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedProduct.catalog_url && (
                                                    <div className="p-6 bg-surface-subtle rounded-3xl border border-border group/btn relative overflow-hidden">
                                                        <Download className="text-primary-500 mb-3" size={24} />
                                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'الكتالوج' : 'Catalog'}</p>
                                                        <a href={selectedProduct.catalog_url} target="_blank" className="text-sm font-bold text-text-main hover:text-primary-600 block transition-colors">{isAr ? 'عرض الكتالوج' : 'View Catalog'}</a>
                                                    </div>
                                                )}
                                                {selectedProduct.data_sheet_url && (
                                                    <div className="p-6 bg-surface-subtle rounded-3xl border border-border group/btn relative overflow-hidden">
                                                        <FileIcon size={24} className="text-emerald-500 mb-3" />
                                                        <p className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mb-1">{isAr ? 'ملف البيانات' : 'Data Sheet'}</p>
                                                        <a href={selectedProduct.data_sheet_url} target="_blank" className="text-sm font-bold text-text-main hover:text-emerald-600 block transition-colors">{isAr ? 'تحميل البيانات' : 'Download PDF'}</a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="pt-8 flex flex-col sm:flex-row gap-4">
                                                <button
                                                    onClick={() => setShowInquiryForm(true)}
                                                    className="flex-1 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-[2rem] font-bold shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
                                                >
                                                    <ShoppingBag size={24} />
                                                    {isAr ? 'اطلب الجهاز الآن' : 'Inquire Now'}
                                                </button>
                                                <button
                                                    onClick={(e) => handleShare(e, selectedProduct)}
                                                    className="px-10 py-5 glass border border-border rounded-[2rem] font-bold text-text-main flex items-center justify-center gap-2 hover:bg-surface transition-all"
                                                >
                                                    <Share2 size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Inquiry Form Modal */}
                    <AnimatePresence>
                        {showInquiryForm && (
                            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInquiryForm(false)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    className="bg-surface w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-[2001] border border-border transition-colors overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                                    <button onClick={() => setShowInquiryForm(false)} className={`absolute top-6 ${isAr ? 'left-6' : 'right-6'} p-2 bg-surface-subtle rounded-xl hover:text-rose-500 transition-all`}><X size={18} /></button>

                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <ShoppingBag size={32} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-text-main">{isAr ? 'طلب عرض سعر' : 'Quick Inquiry'}</h3>
                                        <p className="text-text-subtle text-xs font-bold uppercase tracking-widest mt-2">{isAr ? 'للجهاز المختار' : 'For the selected device'}</p>
                                        <div className="mt-4 p-3 bg-surface-subtle border border-border rounded-2xl text-xs font-bold text-primary-600">
                                            {isAr ? selectedProduct?.name_ar : selectedProduct?.name_en}
                                        </div>
                                    </div>

                                    <form onSubmit={handleInquiry} className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle" size={16} />
                                                <input
                                                    placeholder={isAr ? 'اسمك بالكامل' : 'Full Name'}
                                                    required
                                                    className={`w-full py-4 ${isAr ? 'pr-4 pl-12 text-right' : 'pl-12 pr-4'} bg-surface/50 border border-border rounded-2xl font-bold text-sm outline-none focus:border-primary-500`}
                                                    value={form.name}
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle" size={16} />
                                                <input
                                                    placeholder={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                                                    type="email"
                                                    required
                                                    className={`w-full py-4 ${isAr ? 'pr-4 pl-12 text-right' : 'pl-12 pr-4'} bg-surface/50 border border-border rounded-2xl font-bold text-sm outline-none focus:border-primary-500`}
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle" size={16} />
                                                <input
                                                    placeholder={isAr ? 'رقم الهاتف' : 'Phone Number'}
                                                    required
                                                    className={`w-full py-4 ${isAr ? 'pr-4 pl-12 text-right' : 'pl-12 pr-4'} bg-surface/50 border border-border rounded-2xl font-bold text-sm outline-none focus:border-primary-500`}
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle" size={16} />
                                                <input
                                                    placeholder={isAr ? 'الشركة / الجهة' : 'Company'}
                                                    className={`w-full py-4 ${isAr ? 'pr-4 pl-12 text-right' : 'pl-12 pr-4'} bg-surface/50 border border-border rounded-2xl font-bold text-sm outline-none focus:border-primary-500`}
                                                    value={form.company}
                                                    onChange={e => setForm({ ...form, company: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <MessageSquare className="absolute left-4 top-4 text-text-subtle" size={16} />
                                                <textarea
                                                    placeholder={isAr ? 'رسالتك (اختياري)' : 'Your Message (Optional)'}
                                                    className={`w-full h-32 py-4 ${isAr ? 'pr-4 pl-12 text-right' : 'pl-12 pr-4'} bg-surface/50 border border-border rounded-2xl font-bold text-sm outline-none focus:border-primary-500 resize-none`}
                                                    value={form.message}
                                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            disabled={inquirySent}
                                            type="submit"
                                            className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                                        >
                                            {inquirySent ? (
                                                <>
                                                    <CheckCircle2 size={20} />
                                                    {isAr ? 'تم الإرسال!' : 'Request Sent!'}
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    {isAr ? 'إرسال الطلب' : 'Send Inquiry'}
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                </motion.div>
            </AnimatePresence>

            <PublicFooter />
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
};

export default Store;
