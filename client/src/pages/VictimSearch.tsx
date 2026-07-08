import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { victimApi } from '../services/api';

/**
 * Victim Search + Sociological Crime Insights (problem statement
 * section 4). The demographic cross-tab and socio-economic correlation
 * data come pre-aggregated from victim.service.js — deliberately raw
 * counts rather than an inferred "risk narrative", so the chart is a
 * transparent reflection of the underlying records.
 */
export default function VictimSearch() {
  const { data: demographics } = useQuery({
    queryKey: ['victim-demographics'],
    queryFn: () => victimApi.getDemographics() as any
  });

  const { data: socioEconomic } = useQuery({
    queryKey: ['victim-socio-economic'],
    queryFn: () => victimApi.getSocioEconomic() as any
  });

  const ageBands = ['0-11', '12-17', '18-29', '30-44', '45-59', '60+'];
  const demoRows = demographics?.data || [];
  const ageBandTotals = ageBands.map((band) =>
    demoRows.filter((r: any) => r.ageBand === band).reduce((sum: number, r: any) => sum + r.count, 0)
  );

  const ageChartOption = {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: ageBands, axisLine: { lineStyle: { color: '#2b3a4d' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1f2b3a' } } },
    series: [{ data: ageBandTotals, type: 'bar', itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }]
  };

  const socioRows = socioEconomic?.data || [];
  const occupationTotals: Record<string, number> = {};
  socioRows.forEach((r: any) => { occupationTotals[r.occupation] = (occupationTotals[r.occupation] || 0) + r.count; });

  const socioChartOption = {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['45%', '70%'],
      data: Object.entries(occupationTotals).map(([name, value]) => ({ name, value })),
      itemStyle: { borderColor: '#0f1620', borderWidth: 2 },
      label: { color: '#94a3b8', fontSize: 11 }
    }]
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Victim Search & Sociological Insights</h1>
        <p className="text-sm text-slate-500 mt-1">
          Demographic and socio-economic patterns across complainants and victims
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Victim Age Distribution</h2>
          <ReactECharts option={ageChartOption} style={{ height: 300 }} />
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Complainant Occupation Breakdown</h2>
          <ReactECharts option={socioChartOption} style={{ height: 300 }} />
        </div>
      </div>

      <div className="card">
        <p className="text-xs text-slate-500">
          Note: these figures reflect complainant-reported demographic fields at time of FIR registration and are
          intended to surface socio-economic patterns for policy and preventive planning — not to profile
          individuals. All figures are drawn directly from ComplainantDetails and Victim records without inference.
        </p>
      </div>
    </div>
  );
}
