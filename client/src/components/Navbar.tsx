import React from 'react';
import { Bell, Search, Globe, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-base-700 bg-base-900/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 text-slate-500 w-96">
        <Search size={16} />
        <input
          type="text"
          placeholder="Quick search: FIR number, accused name, crime type..."
          className="bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 border border-base-600 rounded-lg px-3 py-1.5"
          title="Toggle English / Kannada"
        >
          <Globe size={14} />
          {language === 'en' ? 'EN' : 'ಕನ್ನಡ'}
        </button>

        <button className="relative text-slate-400 hover:text-slate-100">
          <Bell size={19} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-risk-high rounded-full" />
        </button>

        <div className="flex items-center gap-2 border-l border-base-700 pl-4">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold">
            {user?.employeeName?.slice(0, 2).toUpperCase() || 'KS'}
          </div>
          <button className="text-slate-500 hover:text-risk-high" title={t('signOut')}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
