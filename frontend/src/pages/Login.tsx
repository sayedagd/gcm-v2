import React from 'react';
import { useStore } from '@/context';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Globe } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';

const Login: React.FC = () => {
  const { saasConfig, updateSaaS, darkMode, setDarkMode } = useStore();
  const navigate = useNavigate();
  const isAr = saasConfig.language === 'ar';

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col p-6 transition-colors duration-300">
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full mb-10">
        <button onClick={() => navigate('/landing')} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg shadow-sm text-xs font-medium text-text-subtle hover:text-primary-600 transition-colors border border-border">
          <Home size={16} /> {isAr ? 'العودة للموقع' : 'Back to Home'}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-surface border border-border text-text-subtle hover:text-text-main transition-all shadow-sm"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => updateSaaS({ language: isAr ? 'en' : 'ar' })} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg shadow-sm text-xs font-medium text-text-subtle border border-border">
            <Globe size={16} className="text-emerald-500" /> {isAr ? 'English' : 'العربية'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-border overflow-hidden z-10 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-primary-600/20">G</div>
            <h1 className="text-2xl font-bold text-text-main">{isAr ? saasConfig.appNameAr : saasConfig.appNameEn}</h1>
            <p className="text-text-subtle font-medium mt-1 text-xs">{isAr ? 'بوابة النظام الإداري الموحد' : 'Unified Management Portal'}</p>
          </div>

          <LoginForm />
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
