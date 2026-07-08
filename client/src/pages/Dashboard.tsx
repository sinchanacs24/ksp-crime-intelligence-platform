import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { FileText, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { analyticsApi, predictionApi } from '../services/api';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => analyticsApi.getDashboardSummary() as any
  });

  const { data: trend } = useQuery({
    queryKey: ['crime-trend-dashboard'],
    queryFn: () => analyticsApi.getCrimeTrend({}) as any
  });

  const { data: forecasts } = useQuery({
    queryKey: ['forecasts-dashboard'],
    queryFn: () => predictionApi.getForecasts() as any
  });

  const trendRows = trend?.data || [];
  const months = Array.from(new Set(trendRows.map((r: any) => r.month))).sort();
  const totalsByMonth = months.map(
    (m) => trendRows.filter((r: any) => r.month === m).reduce((sum: number, r: any) => sum + r.count, 0)
  );

  const chartOption = {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: months, axisLine: { lineStyle: { color: '#2b3a4d' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1f2b3a' } } },
    series: [{
      data: totalsByMonth, type: 'line', smooth: true, areaStyle: { color: 'rgba(59,130,246,0.15)' },
      lineStyle: { color: '#3b82f6', width: 2 }, symbol: 'none'
    }]
  };

  const highRiskForecasts = (forecasts?.data || []).filter((f: any) => f.RiskLevel === 'High').slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">
          Welcome back{user ? `, ${user.employeeName}` : ''}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {user?.roleName} · Overview of statewide crime intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value={summary?.data?.totalCases ?? '—'} icon={FileText} />
        <StatCard label="Under Investigation" value={summary?.data?.byStatus?.[2] ?? '—'} icon={Users} />
        <StatCard label="High-Risk Forecasts" value={highRiskForecasts.length} icon={AlertTriangle} />
        <StatCard label="Chargesheeted" value={summary?.data?.byStatus?.[3] ?? '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Crime Trend (All Categories)</h2>
          <ReactECharts option={chartOption} style={{ height: 280 }} />
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Hotspot Early Warnings</h2>
          <div className="space-y-3">
            {highRiskForecasts.length === 0 && (
              <p className="text-xs text-slate-500">No high-risk forecasts currently flagged.</p>
            )}
            {highRiskForecasts.map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-base-700 pb-2 last:border-0">
                <div>
                  <div className="text-sm text-slate-200">Station #{f.UnitID}</div>
                  <div className="text-xs text-slate-500">Crime Sub-head #{f.CrimeSubHeadID}</div>
                </div>
                <RiskBadge level={f.RiskLevel} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
