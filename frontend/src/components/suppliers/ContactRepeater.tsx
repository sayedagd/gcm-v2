import React from 'react';
import { Phone, Plus, X } from 'lucide-react';
import { Button, Card, Input } from '@/components';
import { SupplierContact } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactRepeaterProps {
    contacts: SupplierContact[];
    onChange: (contacts: SupplierContact[]) => void;
    isAr: boolean;
}

const ContactRepeater: React.FC<ContactRepeaterProps> = ({ contacts, onChange, isAr }) => {
    const add = () => onChange([...contacts, { name: '', phone: '', email: '', role: '' }]);
    const remove = (i: number) => onChange(contacts.filter((_, idx) => idx !== i));
    const update = (i: number, field: keyof SupplierContact, val: string) => {
        const nc = [...contacts]; nc[i] = { ...nc[i], [field]: val }; onChange(nc);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h4 className="flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em]">
                    <Phone size={14} className="text-amber-500" /> {isAr ? 'بروتوكول جهات الاتصال' : 'Supplier Contacts'}
                </h4>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={add}
                    className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    icon={Plus}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {contacts.map((c, i) => (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={i}>
                            <Card className="p-6 relative group border-slate-100 dark:border-slate-800">
                                <button onClick={() => remove(i)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={14} /></button>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <Input label={isAr ? 'الاسم' : 'Full Name'} value={c.name} onChange={val => update(i, 'name', val)} placeholder="Full Name" />
                                        <Input label={isAr ? 'الجوال' : 'Phone'} value={c.phone} onChange={val => update(i, 'phone', val)} placeholder="+966 XXX XXX XXX" />
                                    </div>
                                    <div className="space-y-4">
                                        <Input label={isAr ? 'الدور' : 'Role'} value={c.role} onChange={val => update(i, 'role', val)} placeholder="Manager / Coordinator" />
                                        <Input label={isAr ? 'الإيميل' : 'Email'} value={c.email} onChange={val => update(i, 'email', val)} placeholder="name@domain.com" />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ContactRepeater;
