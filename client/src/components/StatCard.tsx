import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
}

export default function StatCard({ label, value, icon: Icon, trend, trendPositive }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold text-slate-100 mt-2">{value}</div>
        {trend && (
          <div className={`text-xs mt-1 ${trendPositive ? 'text-risk-low' : 'text-risk-high'}`}>{trend}</div>
        )}
      </div>
      <div className="bg-accent/10 text-accent p-2.5 rounded-lg">
        <Icon size={20} />
      </div>
    </div>
  );
}
