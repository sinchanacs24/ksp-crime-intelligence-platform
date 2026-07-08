import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { predictionApi } from '../services/api';
import RiskBadge from '../components/RiskBadge';

/**
 * Crime Forecasting & Hotspot Forecast (problem statement section 8,
 * modules 14-15). Reads pre-computed forecasts written nightly by the
 * forecast-job Catalyst Job Function; the "Recompute Now" button exists
 * for demo purposes so judges can see the model run live without
 * waiting for the 2 AM cron.
 */
export default function Prediction() {
  const queryClient = useQueryClient();

  const { data: forecasts, isFetching } = useQuery({
    queryKey: ['forecasts'],
    queryFn: () => predictionApi.getForecasts() as any
  });

  const recompute = useMutation({
    mutationFn: () => predictionApi.recompute() as any,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forecasts'] })
  });

  const rows = forecasts?.data || [];
  const byRisk = { High: rows.filter((r: any) => r.RiskLevel === 'High'), Medium: rows.filter((r: any) => r.RiskLevel === 'Medium'), Low: rows.filter((r: any) => r.RiskLevel === 'Low') };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Crime Prediction & Hotspot Forecast</h1>
          <p className="text-sm text-slate-500 mt-1">
            Next-month risk projections per police station and crime category, using a transparent trend-slope model
          </p>
        </div>
        <button
          onClick={() => recompute.mutate()}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={recompute.isPending}
        >
          <RefreshCw size={14} className={recompute.isPending ? 'animate-spin' : ''} />
          Recompute Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['High', 'Medium', 'Low'] as const).map((level) => (
          <div key={level} className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">{level} Risk</h2>
              <RiskBadge level={level} />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {byRisk[level].length === 0 && <p className="text-xs text-slate-500">None</p>}
              {byRisk[level].map((f: any, i: number) => (
                <div key={i} className="bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-sm">
                  <div className="text-slate-200">Station #{f.UnitID}</div>
                  <div className="text-xs text-slate-500">
                    Crime sub-head #{f.CrimeSubHeadID} · window {f.PredictedWindowStart} → {f.PredictedWindowEnd}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isFetching && <p className="text-xs text-slate-500">Loading forecasts...</p>}
      {!isFetching && rows.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-12 text-slate-600">
          <TrendingUp size={32} />
          <p className="text-sm mt-2">No forecasts computed yet. Click "Recompute Now" or wait for the nightly job.</p>
        </div>
      )}
    </div>
  );
}
