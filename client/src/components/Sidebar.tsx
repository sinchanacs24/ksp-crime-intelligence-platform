import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileSearch, Users, HeartPulse, Share2, BarChart3,
  TrendingUp, Landmark, Bot, ShieldCheck, ScrollText, Shield
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard', end: true },
  { to: '/fir-search', icon: FileSearch, labelKey: 'firSearch' },
  { to: '/criminal-search', icon: Users, labelKey: 'criminalSearch' },
  { to: '/victim-search', icon: HeartPulse, labelKey: 'victimSearch' },
  { to: '/network-analysis', icon: Share2, labelKey: 'networkAnalysis' },
  { to: '/analytics', icon: BarChart3, labelKey: 'analytics' },
  { to: '/prediction', icon: TrendingUp, labelKey: 'prediction' },
  { to: '/financial-crime', icon: Landmark, labelKey: 'financialCrime' },
  { to: '/ai-assistant', icon: Bot, labelKey: 'aiAssistant' }
];

const ADMIN_ITEMS = [
  { to: '/admin', icon: ShieldCheck, labelKey: 'adminPanel' },
  { to: '/audit-logs', icon: ScrollText, labelKey: 'auditLogs' }
];

export default function Sidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.roleName === 'Admin' || user?.roleName === 'Supervisor';

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-accent/15 text-accent border border-accent/30' : 'text-slate-400 hover:bg-base-700 hover:text-slate-100'
    }`;

  return (
    <aside className="w-64 h-screen sticky top-0 bg-base-900 border-r border-base-700 flex flex-col">
      <div className="px-5 py-6 border-b border-base-700">
        <div className="flex items-center gap-2">
          <Shield className="text-accent" size={26} />
          <div>
            <div className="text-sm font-semibold text-slate-100 leading-tight">KSP Crime Intel</div>
            <div className="text-[11px] text-slate-500 leading-tight">Karnataka State Police</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClasses}>
            <item.icon size={18} />
            {t(item.labelKey)}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-4 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
              Governance
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClasses}>
                <item.icon size={18} />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {user && (
        <div className="px-4 py-4 border-t border-base-700 text-xs text-slate-500">
          <div className="text-slate-300 font-medium">{user.employeeName}</div>
          <div>{user.roleName}</div>
        </div>
      )}
    </aside>
  );
}
