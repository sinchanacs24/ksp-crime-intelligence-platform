import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import ReactECharts from 'echarts-for-react';
import { analyticsApi } from '../services/api';

/**
 * Crime Pattern & Trend Analytics (problem statement section 3,
 * modules 13 + 16). Heatmap uses react-leaflet with CircleMarkers sized
 * by density rather than a heat-layer plugin, to avoid an extra native
 * dependency — swap for leaflet.heat if a smoother gradient is desired.
 */
export default function Analytics() {
  const [crimeSubHeadId, setCrimeSubHeadId] = useState<string>('');

  const { data: trend } = useQuery({
    queryKey: ['crime-trend', crimeSubHeadId],
    queryFn: () => analyticsApi.getCrimeTrend({ crimeSubHeadId: crimeSubHeadId || undefined }) as any
  });

  const { data: heatmap } = useQuery({
    queryKey: ['heatmap', crimeSubHeadId],
    queryFn: () => analyticsApi.getHeatmap({ crimeSubHeadId: crimeSubHeadId || undefined }) as any
  });

  const trendRows = trend?.data || [];
  const months = Array.from(new Set(trendRows.map((r: any) => r.month))).sort();
  const bySubHead: Record<string, number[]> = {};
  trendRows.forEach((r: any) => {
    bySubHead[r.crimeSubHeadId] = bySubHead[r.crimeSubHeadId] || Array(months.length).fill(0);
    const idx = months.indexOf(r.month);
    bySubHead[r.crimeSubHeadId][idx] = r.count;
  });

  const trendChartOption = {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: months, axisLine: { lineStyle: { color: '#2b3a4d' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1f2b3a' } } },
    series: Object.entries(bySubHead).map(([subHeadId, counts]) => ({
      name: `Sub-head ${subHeadId}`, type: 'line', smooth: true, data: counts, symbol: 'none'
    }))
  };

  const points = heatmap?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Crime Pattern & Trend Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Geographic hotspots and time-series crime trends</p>
        </div>
        <input
          type="text"
          placeholder="Filter by Crime Sub-head ID"
          value={crimeSubHeadId}
          onChange={(e) => setCrimeSubHeadId(e.target.value)}
          className="input-field w-64"
        />
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Crime Trend by Category</h2>
        <ReactECharts option={trendChartOption} style={{ height: 320 }} />
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Crime Hotspot Map ({points.length} incidents)</h2>
        <div className="rounded-lg overflow-hidden h-[420px]">
          <MapContainer center={[15.3173, 75.7139]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            {points.map((p: any, i: number) => (
              <CircleMarker key={i} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: '#ef4444', fillOpacity: 0.6 }}>
                <Popup>
                  Case #{p.caseMasterId}<br />
                  Sub-head: {p.crimeSubHeadId}<br />
                  Date: {new Date(p.date).toLocaleDateString()}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
