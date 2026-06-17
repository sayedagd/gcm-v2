"use client";


import React, { useState } from 'react';
import Image from 'next/image';
import { useStore } from '@/context';
import { Mail, Shield, Calendar, Clock, Edit3, Camera, Save, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { handleImageError } from '@/utils/helpers';

const Profile: React.FC = () => {
  const { currentUser, logs, upsertUser, saasConfig } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(currentUser.name);
  const [editedAvatar, setEditedAvatar] = useState(currentUser.avatar);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAr = saasConfig.language === 'ar';

  const userLogs = logs.filter(l => l.user_id === currentUser.id).slice(0, 10);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await upsertUser({
        ...currentUser,
        name: editedName,
        ...(editedAvatar ? { avatar: editedAvatar } : {})
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden transition-colors">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12">
            <div className="relative group">
              <Image src={(isEditing ? editedAvatar : currentUser.avatar) || '/logo.png'} onError={handleImageError} className="w-24 h-24 rounded-2xl border-4 border-surface bg-surface-subtle shadow-lg object-cover" alt="" width={96} height={96} unoptimized />
              {isEditing && (
                <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-lg shadow-md cursor-pointer hover:scale-110 transition-transform">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold flex items-center gap-2">
                    <X size={16} /> {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className={`px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-surface-subtle border border-border hover:bg-surface text-text-main rounded-xl text-sm font-semibold transition-colors flex items-center">
                  <Edit3 size={16} className="mr-2" />
                  {isAr ? 'تعديل الملف' : 'Edit Profile'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isEditing ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  className="w-full max-w-md p-3 bg-surface-subtle dark:text-text-main rounded-xl font-bold border border-border focus:ring-2 ring-emerald-500/20 outline-none"
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{currentUser.name}</h1>
            )}

            <p className="text-text-subtle flex items-center mt-1 font-bold">
              <Mail size={14} className="mr-2" />
              {currentUser.email}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-surface-subtle rounded-2xl border border-border">
              <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest">{isAr ? 'الصلاحية' : 'Role'}</p>
              <p className="text-lg font-bold text-emerald-600 capitalize mt-1 flex items-center">
                <Shield size={16} className="mr-2" />
                {currentUser.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
            <div className="p-4 bg-surface-subtle rounded-2xl border border-border">
              <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest">{isAr ? 'انضم في' : 'Joined'}</p>
              <p className="text-lg font-bold text-text-main mt-1 flex items-center">
                <Calendar size={16} className="mr-2" />
                Jan 2024
              </p>
            </div>
            <div className="p-4 bg-surface-subtle rounded-2xl border border-border hidden sm:block">
              <p className="text-[10px] uppercase font-bold text-text-subtle tracking-widest">{isAr ? 'إجمالي الأنشطة' : 'Total Actions'}</p>
              <p className="text-lg font-bold text-text-main mt-1 flex items-center">
                <Clock size={16} className="mr-2" />
                {userLogs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border shadow-sm p-8 transition-colors">
        <h2 className="text-lg font-bold mb-6 flex items-center">
          <Clock size={20} className="mr-2 text-emerald-500" />
          {isAr ? 'آخر الأنشطة' : 'Your Recent Activity'}
        </h2>
        <div className="space-y-6">
          {userLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between border-b border-surface-subtle pb-4 last:border-0 last:pb-0">
              <div className="flex space-x-4">
                <div className={`p-2 rounded-lg ${log.action === 'CREATED' ? 'bg-emerald-50 text-emerald-600' :
                  log.action === 'UPDATED' ? 'bg-blue-50 text-blue-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {isAr ? 'قمت بـ ' : 'You '} {log.action.toLowerCase()} {log.entity_type} <span className="text-emerald-500">{log.entity_name}</span>
                  </p>
                  <p className="text-xs text-text-subtle mt-1">{log.details}</p>
                </div>
              </div>
              <p className="text-[10px] text-text-subtle font-bold uppercase whitespace-nowrap">
                {format(parseISO(log.timestamp), 'MMM d, h:mm a')}
              </p>
            </div>
          ))}
          {userLogs.length === 0 && (
            <div className="py-12 text-center text-text-subtle italic">{isAr ? 'لا يوجد سجل أنشطة حالياً' : 'No activity logs recorded yet.'}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

