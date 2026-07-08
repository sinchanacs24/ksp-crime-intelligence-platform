import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertTriangle, TrendingUp } from 'lucide-react';
import { accusedApi } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function CriminalSearch() {
  const [name, setName] = useState('');
  const [submittedName, setSubmittedName] = useState('');

  const { data: profile, isFetching } = useQuery({
    queryKey: ['accused-profile', submittedName],
    queryFn: () => accusedApi.getProfile(submittedName) as any,
    enabled: !!submittedName
  });

  const { data: repeatOffenders } = useQuery({
    queryKey: ['repeat-offenders'],
    queryFn: () => accusedApi.getRepeatOffenders(2) as any
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Criminal Search & Behavioral Profiling</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search offenders by name for cross-case history, escalation signals, and risk scoring
        </p>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Enter accused / offender name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSubmittedName(name)}
          className="input-field flex-1"
        />
        <button onClick={() => setSubmittedName(name)} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card min-h-[300px]">
          {isFetching && <p className="text-xs text-slate-500">Loading profile...</p>}

          {!isFetching && profile?.data && profile.data.totalCases > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100">{profile.data.accusedName}</h2>
                {profile.data.escalationSignal && (
                  <span className="badge-risk-high flex items-center gap-1">
                    <AlertTriangle size={12} /> Escalation detected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-slate-500 text-xs">Total Cases</div><div className="text-slate-200 text-lg">{profile.data.totalCases}</div></div>
                <div><div className="text-slate-500 text-xs">Distinct Crime Types</div><div className="text-slate-200 text-lg">{profile.data.crimeTypes.length}</div></div>
              </div>

              <div>
                <div className="text-slate-500 text-xs mb-2">Case History</div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {profile.data.history.map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <div className="text-slate-200 font-mono text-xs">{h.crimeNo}</div>
                        <div className="text-slate-500 text-xs">{h.registeredDate}</div>
                      </div>
                      <RiskBadge level={h.gravityOffenceId === 2 ? 'High' : 'Low'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isFetching && profile?.data && profile.data.totalCases === 0 && (
            <p className="text-sm text-slate-500">No records found for "{submittedName}".</p>
          )}

          {!submittedName && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 py-16">
              <TrendingUp size={32} />
              <p className="text-sm mt-2">Search a name to view behavioral profile</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Repeat Offenders (Statewide)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {repeatOffenders?.data?.map((r: any, i: number) => (
              <button
                key={i}
                onClick={() => { setName(r.AccusedName); setSubmittedName(r.AccusedName); }}
                className="w-full flex items-center justify-between text-left bg-base-900 border border-base-700 hover:border-accent/40 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-slate-200">{r.AccusedName}</span>
                <span className="text-xs text-slate-500">{r.caseCount} cases</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
