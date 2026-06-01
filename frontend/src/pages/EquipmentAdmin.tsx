
import React, { useState } from 'react';
import { useStore } from '@/context';
import {
    Package, Plus, Edit2, Trash2, Search,
    MessageSquare, Send, Share, Download, Upload, File as FileIcon,
    Image as ImageIcon, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EquipmentAdmin: React.FC = () => {
    const {
        environmentalEquipments, equipmentInquiries, saasConfig,
        upsertEquipment, deleteEquipment, updateEquipmentInquiry, deleteEquipmentInquiry, updateStorePage
    } = useStore();
    const isAr = saasConfig.language === 'ar';
    const [tab, setTab] = useState<'EQUIPMENT' | 'INQUIRIES' | 'SETTINGS'>('EQUIPMENT');
    const [search, setSearch] = useState('');

    const [editingEquipment, setEditingEquipment] = useState<any>(null);
    const [replyingInquiry, setReplyingInquiry] = useState<any>(null);
    const [viewingInquiry, setViewingInquiry] = useState<any>(null);
    const [replyText, setReplyText] = useState('');

    // [EN] Export products to JSON
    // [AR] تصدير المنتجات لملف JSON
    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(environmentalEquipments, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `gcm_store_export_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // [EN] Import products from JSON
    // [AR] استيراد منتجات من ملف JSON
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (re) => {
            try {
                const imported = JSON.parse(re.target?.result as string);
                if (Array.isArray(imported)) {
                    for (const item of imported) {
                        await upsertEquipment(item);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    const filteredEquipments = environmentalEquipments.filter(e =>
        (isAr ? e.name_ar : e.name_en).toLowerCase().includes(search.toLowerCase())
    );

    const filteredInquiries = equipmentInquiries.filter(i =>
        (i.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleSaveEquipment = (e: React.FormEvent) => {
        e.preventDefault();
        upsertEquipment(editingEquipment);
        setEditingEquipment(null);
    };

    const handleSendReply = async () => {
        if (!replyingInquiry) return;
        await updateEquipmentInquiry(replyingInquiry.id, {
            ...replyingInquiry,
            admin_reply: replyText,
            status: 'REPLIED'
        });
        setReplyingInquiry(null);
        setReplyText('');
    };

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-main mb-2">
                        {isAr ? 'إدارة المتجر الإلكتروني' : 'Store Management'}
                    </h1>
                    <p className="text-text-subtle font-medium text-sm">
                        {isAr ? 'تحكم في الأجهزة المعروضة وطلبات العملاء' : 'Manage catalog equipment and customer inquiries'}
                    </p>
                </div>
                {tab === 'EQUIPMENT' && (
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        <label className="px-4 py-2.5 md:px-6 md:py-3 bg-surface-subtle border border-border hover:border-primary-500 text-text-main rounded-2xl font-bold flex items-center gap-2 cursor-pointer transition-all text-sm">
                            <Download size={18} />
                            <span>{isAr ? 'استيراد' : 'Import'}</span>
                            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
                        </label>
                        <button
                            onClick={handleExport}
                            className="px-4 py-2.5 md:px-6 md:py-3 bg-surface-subtle border border-border hover:border-primary-500 text-text-main rounded-2xl font-bold flex items-center gap-2 transition-all text-sm"
                        >
                            <Upload size={18} />
                            <span>{isAr ? 'تصدير' : 'Export'}</span>
                        </button>
                        <button
                            onClick={() => setEditingEquipment({ equipment_id: `EQ-${Date.now()}`, name_ar: '', name_en: '', description_ar: '', description_en: '', status: 'AVAILABLE', additional_images: [], image_url: '', catalog_url: '', data_sheet_url: '' })}
                            className="px-4 py-2.5 md:px-6 md:py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all text-sm"
                        >
                            <Plus size={18} />
                            <span>{isAr ? 'إضافة جهاز' : 'Add Equipment'}</span>
                        </button>
                    </div>
                )}
            </div>


            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex p-1 bg-surface-subtle border border-border rounded-2xl w-full md:w-auto">
                    <button
                        onClick={() => setTab('EQUIPMENT')}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === 'EQUIPMENT' ? 'bg-surface text-primary-600 shadow-md' : 'text-text-subtle'}`}
                    >
                        <Package size={18} />
                        {isAr ? 'الأجهزة' : 'Equipments'}
                    </button>
                    <button
                        onClick={() => setTab('INQUIRIES')}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === 'INQUIRIES' ? 'bg-surface text-primary-600 shadow-md' : 'text-text-subtle'}`}
                    >
                        <MessageSquare size={18} />
                        {isAr ? 'الاستفسارات' : 'Inquiries'}
                        {equipmentInquiries.filter(i => i.status === 'PENDING').length > 0 && (
                            <span className="w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">
                                {equipmentInquiries.filter(i => i.status === 'PENDING').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('SETTINGS')}
                        className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === 'SETTINGS' ? 'bg-surface text-primary-600 shadow-md' : 'text-text-subtle'}`}
                    >
                        <Edit2 size={18} />
                        {isAr ? 'إعدادات الصفحة' : 'Page Settings'}
                    </button>
                </div>
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-subtle group-focus-within:text-primary-500 transition-colors" size={18} />
                    <input
                        placeholder={isAr ? 'بحث...' : 'Search...'}
                        className={`w-full py-4 ${isAr ? 'pr-6 pl-12 text-right' : 'pl-12 pr-6'} bg-surface/50 border border-border rounded-2xl outline-none focus:border-primary-500 transition-all font-bold text-sm`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden">
                {tab === 'EQUIPMENT' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start">
                            <thead className="bg-surface-subtle border-b border-border">
                                <tr className="text-text-subtle text-[10px] font-bold uppercase tracking-widest text-start">
                                    <th className="p-6">{isAr ? 'الجهاز' : 'Equipment'}</th>
                                    <th className="p-6">{isAr ? 'الحالة' : 'Status'}</th>
                                    <th className="p-6 text-center">{isAr ? 'إحصائيات' : 'Stats'}</th>
                                    <th className="p-6 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredEquipments.map(e => (
                                    <tr key={e.equipment_id} className="hover:bg-surface-subtle transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <img src={e.image_url || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80'} className="w-12 h-12 rounded-xl object-cover" />
                                                <div>
                                                    <p className="font-bold text-text-main">{isAr ? e.name_ar : e.name_en}</p>
                                                    <p className="text-[10px] text-text-subtle">{e.equipment_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-text-subtle">
                                                    <Share size={12} className="text-primary-500" />
                                                    {e.share_count || 0}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-text-subtle">
                                                    <ImageIcon size={12} className="text-blue-500" />
                                                    {e.additional_images?.length || 0}
                                                </div>
                                                {e.data_sheet_url && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                                                        <FileIcon size={12} />
                                                        DOC
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setEditingEquipment(e)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                <button onClick={() => deleteEquipment(e.equipment_id)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : tab === 'INQUIRIES' ? (
                    /* Inquiries List */
                    <div className="overflow-x-auto">
                        <table className="w-full text-start">
                            <thead className="bg-surface-subtle border-b border-border">
                                <tr className="text-text-subtle text-[10px] font-bold uppercase tracking-widest text-start">
                                    <th className="p-6">{isAr ? 'العميل' : 'Customer'}</th>
                                    <th className="p-6">{isAr ? 'الجهاز' : 'Equipment'}</th>
                                    <th className="p-6">{isAr ? 'الرسالة' : 'Message'}</th>
                                    <th className="p-6">{isAr ? 'الحالة' : 'Status'}</th>
                                    <th className="p-6">{isAr ? 'التاريخ' : 'Date'}</th>
                                    <th className="p-6 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredInquiries.map(i => {
                                    const eq = environmentalEquipments.find(x => x.equipment_id === i.equipment_id);
                                    return (
                                        <tr key={i.id} className="hover:bg-surface-subtle transition-colors group">
                                            <td className="p-6 text-start">
                                                <div>
                                                    <p className="font-bold text-text-main">{i.customer_name}</p>
                                                    <p className="text-[10px] text-text-subtle">{i.company} | {i.email} | {i.phone}</p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    {eq && <img src={eq.image_url} className="w-8 h-8 rounded-lg object-cover bg-surface-subtle" />}
                                                    <p className="font-bold text-sm text-primary-600">
                                                        {eq ? (isAr ? eq.name_ar : eq.name_en) : (i.product_name_snapshot || 'Deleted Equipment')}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm text-text-subtle line-clamp-1 max-w-[200px]">
                                                    {i.message || '---'}
                                                </p>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${i.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    {i.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-sm text-text-subtle font-medium">
                                                {new Date(i.created_at || i.timestamp).toLocaleDateString(isAr ? 'ar' : 'en')}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setViewingInquiry(i)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold">
                                                        <Search size={16} />
                                                        {isAr ? 'عرض' : 'View'}
                                                    </button>
                                                    <button onClick={() => setReplyingInquiry(i)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all flex items-center gap-2 text-xs font-bold">
                                                        <MessageSquare size={16} />
                                                        {isAr ? 'رد' : 'Reply'}
                                                    </button>
                                                    <button onClick={() => deleteEquipmentInquiry(i.id)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 max-w-4xl space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'العنوان الرئيسي (عربي)' : 'Hero Title (AR)'}</label>
                            <input
                                className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500 transition-all text-xl"
                                value={saasConfig.storePage?.heroTitleAr || ''}
                                onChange={(e) => updateStorePage({ heroTitleAr: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'العنوان الرئيسي (إنجليزي)' : 'Hero Title (EN)'}</label>
                            <input
                                className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500 transition-all text-xl"
                                value={saasConfig.storePage?.heroTitleEn || ''}
                                onChange={(e) => updateStorePage({ heroTitleEn: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الوصف (عربي)' : 'Hero Description (AR)'}</label>
                            <textarea
                                className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-medium outline-none focus:border-primary-500 transition-all"
                                rows={3}
                                value={saasConfig.storePage?.heroDescAr || ''}
                                onChange={(e) => updateStorePage({ heroDescAr: e.target.value })}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الوصف (إنجليزي)' : 'Hero Description (EN)'}</label>
                            <textarea
                                className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-medium outline-none focus:border-primary-500 transition-all"
                                rows={3}
                                value={saasConfig.storePage?.heroDescEn || ''}
                                onChange={(e) => updateStorePage({ heroDescEn: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {editingEquipment && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingEquipment(null)} className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-surface w-full max-w-2xl rounded-3xl p-10 shadow-2xl relative z-[501] border border-border">
                            <h2 className="text-2xl font-bold mb-8">{isAr ? 'بيانات الجهاز' : 'Equipment Details'}</h2>
                            <form onSubmit={handleSaveEquipment} className="grid grid-cols-2 gap-6">
                                <div className="col-span-1 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                                    <input required className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={editingEquipment.name_ar} onChange={e => setEditingEquipment({ ...editingEquipment, name_ar: e.target.value })} />
                                </div>
                                <div className="col-span-1 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
                                    <input required className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={editingEquipment.name_en} onChange={e => setEditingEquipment({ ...editingEquipment, name_en: e.target.value })} />
                                </div>
                                <div className="col-span-2 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'رابط الصورة الأساسية' : 'Main Image URL'}</label>
                                    <input className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={editingEquipment.image_url} onChange={e => setEditingEquipment({ ...editingEquipment, image_url: e.target.value })} />
                                </div>
                                <div className="col-span-2 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'صور الجاليري (رابط في كل سطر)' : 'Gallery Images (One URL per line)'}</label>
                                    <textarea
                                        className="w-full h-32 p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500"
                                        value={editingEquipment.additional_images?.join('\n')}
                                        onChange={e => setEditingEquipment({ ...editingEquipment, additional_images: e.target.value.split('\n').filter(l => l.trim()) })}
                                        placeholder="https://example.com/img1.jpg"
                                    />
                                </div>
                                <div className="col-span-1 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'رابط الكتالوج' : 'Catalog URL'}</label>
                                    <input className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={editingEquipment.catalog_url} onChange={e => setEditingEquipment({ ...editingEquipment, catalog_url: e.target.value })} />
                                </div>
                                <div className="col-span-1 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'رابط ملف البيانات (Data Sheet)' : 'Data Sheet URL'}</label>
                                    <input className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={editingEquipment.data_sheet_url} onChange={e => setEditingEquipment({ ...editingEquipment, data_sheet_url: e.target.value })} />
                                </div>
                                <div className="col-span-2 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'الوصف' : 'Description'}</label>
                                    <textarea className="w-full h-24 p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500" value={isAr ? editingEquipment.description_ar : editingEquipment.description_en} onChange={e => setEditingEquipment({ ...editingEquipment, [isAr ? 'description_ar' : 'description_en']: e.target.value })} />
                                </div>
                                <div className="col-span-2 space-y-4">
                                    <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'الحالة' : 'Status'}</label>
                                    <select
                                        className="w-full p-4 bg-surface-subtle border border-border rounded-xl font-bold outline-none focus:border-primary-500"
                                        value={editingEquipment.status}
                                        onChange={e => setEditingEquipment({ ...editingEquipment, status: e.target.value })}
                                    >
                                        <option value="AVAILABLE">{isAr ? 'متوفر' : 'Available'}</option>
                                        <option value="OUT_OF_STOCK">{isAr ? 'نفذت الكمية' : 'Out of Stock'}</option>
                                        <option value="DISCONTINUED">{isAr ? 'غير مدعوم' : 'Discontinued'}</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex gap-4 pt-6">
                                    <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all">{isAr ? 'حفظ البيانات' : 'Save Changes'}</button>
                                    <button type="button" onClick={() => setEditingEquipment(null)} className="px-8 py-4 bg-surface-subtle border border-border rounded-xl font-bold text-text-subtle hover:bg-rose-50 hover:text-rose-500 transition-all">{isAr ? 'إلغاء' : 'Cancel'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {replyingInquiry && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReplyingInquiry(null)} className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-surface w-full max-w-md rounded-3xl p-10 shadow-2xl relative z-[501] border border-border">
                            <h2 className="text-2xl font-bold mb-4">{isAr ? 'الرد على الاستفسار' : 'Reply to Inquiry'}</h2>
                            <div className="mb-6 p-4 bg-surface-subtle rounded-2xl border border-border">
                                <p className="text-xs font-bold text-text-subtle mb-1">{isAr ? 'رسالة العميل' : 'Customer Message'}</p>
                                <p className="text-sm font-medium text-text-main italic">"{replyingInquiry.message || 'No message provided'}"</p>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-bold text-text-subtle ml-2 tracking-widest">{isAr ? 'نص الرد' : 'Your Reply'}</label>
                                <textarea
                                    className="w-full h-40 p-5 bg-surface-subtle border border-border rounded-2xl font-bold outline-none focus:border-primary-500"
                                    placeholder={isAr ? 'اكتب ردك هنا...' : 'Type your reply...'}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                />
                                <div className="flex gap-4 pt-4">
                                    <button onClick={handleSendReply} className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Send size={18} />
                                        {isAr ? 'إرسال الرد' : 'Send Reply'}
                                    </button>
                                    <button onClick={() => setReplyingInquiry(null)} className="px-8 py-4 bg-surface-subtle border border-border rounded-xl font-bold text-text-subtle transition-all">{isAr ? 'إغلاق' : 'Close'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {viewingInquiry && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingInquiry(null)} className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-surface w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative z-[501] border border-border overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                    <MessageSquare size={24} />
                                </div>
                                {isAr ? 'تفاصيل الاستفسار' : 'Inquiry Details'}
                            </h2>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-surface-subtle border border-border rounded-2xl">
                                        <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest mb-1">{isAr ? 'العميل' : 'Customer'}</p>
                                        <p className="font-bold text-text-main">{viewingInquiry.customer_name}</p>
                                    </div>
                                    <div className="p-4 bg-surface-subtle border border-border rounded-2xl">
                                        <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest mb-1">{isAr ? 'الشركة' : 'Company'}</p>
                                        <p className="font-bold text-text-main">{viewingInquiry.company || '---'}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-subtle border border-border rounded-2xl">
                                    <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest mb-2">{isAr ? 'التواصل' : 'Contact'}</p>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                                            <Send size={14} className="text-primary-500" />
                                            {viewingInquiry.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                                            <Phone size={14} className="text-indigo-500" />
                                            {viewingInquiry.phone}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl">
                                    <p className="text-[10px] uppercase font-bold text-primary-600 tracking-widest mb-1">{isAr ? 'المنتج المطلوب' : 'Requested Product'}</p>
                                    <p className="font-bold text-text-main text-lg">
                                        {viewingInquiry.product_name_snapshot || environmentalEquipments.find(e => e.equipment_id === viewingInquiry.equipment_id)?.name_en || 'Deleted Equipment'}
                                    </p>
                                    <p className="text-[10px] text-text-subtle font-bold tracking-widest mt-1">ID: {viewingInquiry.equipment_id}</p>
                                </div>

                                <div className="p-6 bg-surface-subtle border border-border rounded-2xl relative">
                                    <label className="absolute -top-3 left-6 px-3 py-1 bg-surface border border-border rounded-full text-[10px] uppercase font-bold text-text-subtle tracking-widest">
                                        {isAr ? 'الرسالة' : 'Message'}
                                    </label>
                                    <p className="text-text-main font-medium leading-relaxed italic">
                                        "{viewingInquiry.message || 'No message provided'}"
                                    </p>
                                </div>

                                {viewingInquiry.admin_reply && (
                                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl relative">
                                        <label className="absolute -top-3 left-6 px-3 py-1 bg-surface border border-emerald-100 rounded-full text-[10px] uppercase font-bold text-emerald-600 tracking-widest">
                                            {isAr ? 'رد الإدارة' : 'Admin Reply'}
                                        </label>
                                        <p className="text-emerald-900 font-bold leading-relaxed">
                                            {viewingInquiry.admin_reply}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => { setReplyingInquiry(viewingInquiry); setViewingInquiry(null); }} className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <MessageSquare size={18} />
                                        {isAr ? 'رد الآن' : 'Reply Now'}
                                    </button>
                                    <button onClick={() => setViewingInquiry(null)} className="px-8 py-4 bg-surface-subtle border border-border rounded-xl font-bold text-text-subtle transition-all">{isAr ? 'إغلاق' : 'Close'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EquipmentAdmin;
