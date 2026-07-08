import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, ChevronRight } from 'lucide-react';
import { firApi } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function FirSearch() {
  const [crimeNo, setCrimeNo] = useState('');
  const [submittedFilters, setSubmittedFilters] = useState<Record<string, unknown>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  const { data: results, isFetching } = useQuery({
    queryKey: ['fir-search', submittedFilters],
    queryFn: () => firApi.search(submittedFilters) as any,
    enabled: Object.keys(submittedFilters).length > 0
  });

  const { data: caseDetail } = useQuery({
    queryKey: ['fir-detail', selectedCaseId],
    queryFn: () => firApi.getById(selectedCaseId as number) as any,
    enabled: !!selectedCaseId
  });

  const { data: summary } = useQuery({
    queryKey: ['fir-summary', selectedCaseId],
    queryFn: () => firApi.getSummary(selectedCaseId as number) as any,
    enabled: !!selectedCaseId
  });

  const handleSearch = () => {
    setSubmittedFilters({ crimeNo, limit: 50, offset: 0 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">FIR Search</h1>
        <p className="text-sm text-slate-500 mt-1">Search FIRs by crime number, station, category, or date range</p>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Enter Crime Number (e.g. 104430006202600001)"
          value={crimeNo}
          onChange={(e) => setCrimeNo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="input-field flex-1"
        />
        <button onClick={handleSearch} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Results {results?.data ? `(${results.data.length})` : ''}
          </h2>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {isFetching && <p className="text-xs text-slate-500">Searching...</p>}
            {results?.data?.map((c: any) => (
              <button
                key={c.CaseMasterID}
                onClick={() => setSelectedCaseId(c.CaseMasterID)}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedCaseId === c.CaseMasterID
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-base-900 border-base-700 hover:border-base-600'
                }`}
              >
                <div>
                  <div className="text-sm text-slate-200 font-mono">{c.CrimeNo}</div>
                  <div className="text-xs text-slate-500">{c.CrimeRegisteredDate}</div>
                </div>
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            ))}
            {!isFetching && results?.data?.length === 0 && (
              <p className="text-xs text-slate-500">No cases found for this search.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 card">
          {!selectedCaseId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 py-16">
              <FileText size={32} />
              <p className="text-sm mt-2">Select a case to view details</p>
            </div>
          )}

          {selectedCaseId && caseDetail?.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100">{caseDetail.data.CaseMaster.CrimeNo}</h2>
                <RiskBadge level={caseDetail.data.GravityOffence.LookupValue === 'Heinous' ? 'High' : 'Low'} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-slate-500 text-xs">Status</div><div className="text-slate-200">{caseDetail.data.CaseStatusMaster.CaseStatusName}</div></div>
                <div><div className="text-slate-500 text-xs">Crime Type</div><div className="text-slate-200">{caseDetail.data.CrimeHead.CrimeGroupName} / {caseDetail.data.CrimeSubHead.CrimeHeadName}</div></div>
                <div><div className="text-slate-500 text-xs">Station</div><div className="text-slate-200">{caseDetail.data.Unit.UnitName}</div></div>
                <div><div className="text-slate-500 text-xs">Investigating Officer</div><div className="text-slate-200">{caseDetail.data.Employee.FirstName}</div></div>
                <div><div className="text-slate-500 text-xs">Registered</div><div className="text-slate-200">{caseDetail.data.CaseMaster.CrimeRegisteredDate}</div></div>
                <div><div className="text-slate-500 text-xs">Court</div><div className="text-slate-200">{caseDetail.data.Court.CourtName}</div></div>
              </div>

              <div>
                <div className="text-slate-500 text-xs mb-1">Brief Facts</div>
                <p className="text-sm text-slate-300 bg-base-900 border border-base-700 rounded-lg p-3">
                  {caseDetail.data.CaseMaster.BriefFacts}
                </p>
              </div>

              {summary?.data && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">Investigation Timeline ({summary.data.timelineEventCount} events)</div>
                  <div className="space-y-2">
                    {summary.data.timeline.slice(0, 6).map((ev: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <div className="text-slate-500 w-28 shrink-0">{new Date(ev.EventDate).toLocaleDateString()}</div>
                        <div>
                          <span className="text-accent font-medium">{ev.EventType}</span>
                          <span className="text-slate-400"> — {ev.Description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
