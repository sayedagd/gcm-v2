import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useStore } from '@/context';
import { formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface CommunicationsDeckProps {
    isAr: boolean;
}

export const CommunicationsDeck: React.FC<CommunicationsDeckProps> = ({ isAr }) => {
    const { contactSubmissions } = useStore();


    return (
        <div className="h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-text-main flex items-center gap-3">
                    <div className="p-3 bg-pink-500/10 rounded-2xl text-pink-500">
                        <MessageSquare size={24} />
                    </div>
                    {isAr ? 'غرفة الاتصال' : 'Comms Deck'}
                </h3>
                <Link
                    to="/le"
                    className="text-xs font-bold uppercase tracking-widest text-text-subtle hover:text-pink-500 transition-colors flex items-center gap-2"
                >
                    {isAr ? 'عرض الكل' : 'View All'}
                    <ArrowRight size={14} />
                </Link>
            </div>

            <div className="space-y-4">
                {contactSubmissions.slice(0, 4).map((msg: any, idx: number) => (
                    <Link key={msg.id} to="/le" className="block focus:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group relative bg-surface p-5 rounded-xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all border border-border"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 flex items-center justify-center text-pink-600 font-bold text-sm shrink-0">
                                    {msg.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-text-main text-sm truncate">{msg.name}</h4>
                                        <span className="text-[10px] font-bold text-text-subtle bg-surface-subtle px-2 py-1 rounded-full">
                                            {formatDate(new Date(msg.timestamp), 'MMM d')}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wide mb-1 opacity-80">{msg.company}</p>
                                    <p className="text-xs text-text-subtle line-clamp-2 leading-relaxed">"{msg.message}"</p>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}

                {contactSubmissions.length === 0 && (
                    <div className="h-[200px] flex flex-col items-center justify-center text-text-subtle opacity-60 border-2 border-dashed border-border rounded-xl">
                        <MessageSquare size={32} className="mb-4" />
                        <p className="text-sm font-bold">{isAr ? 'لا توجد رسائل جديدة' : 'No new messages'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

