import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Landmark, AlertTriangle } from 'lucide-react';
import { financialApi } from '../services/api';

/**
 * Financial Crime & Transaction Link Analysis (problem statement
 * section 7). Traces a money trail outward from a starting bank account
 * using financial.service.js's bounded-hop traversal, and surfaces the
 * transparent suspicion score + reasons list for Explainable AI.
 */
export default function FinancialCrime() {
  const [accountId, setAccountId] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: trail, isFetching } = useQuery({
    queryKey: ['money-trail', submittedId],
    queryFn: () => financialApi.traceMoneyTrail(submittedId as string, 3) as any,
    enabled: !!submittedId
  });

  const { data: flagged } = useQuery({
    queryKey: ['flagged-transactions'],
    queryFn: () => financialApi.getFlagged(30) as any
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Financial Crime & Money Trail Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Trace suspicious transaction chains and detect layering patterns across linked bank accounts
        </p>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Enter starting Bank Account ID"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSubmittedId(accountId)}
          className="input-field flex-1"
        />
        <button onClick={() => setSubmittedId(accountId)} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Trace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card min-h-[300px]">
          {!submittedId && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 py-16">
              <Landmark size={32} />
              <p className="text-sm mt-2">Enter a bank account ID to trace its transaction network</p>
            </div>
          )}
          {isFetching && <p className="text-xs text-slate-500">Tracing...</p>}

          {trail?.data && !isFetching && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">Suspicion Score</div>
                  <div className="text-3xl font-semibold text-slate-100">{trail.data.suspicionScore}<span className="text-sm text-slate-500">/100</span></div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>{trail.data.accountsInvolved} accounts involved</div>
                  <div>{trail.data.transactionCount} transactions traced</div>
                </div>
              </div>

              {trail.data.reasons.length > 0 && (
                <div className="bg-risk-high/10 border border-risk-high/30 rounded-lg p-3 space-y-1">
                  {trail.data.reasons.map((r: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-risk-high">
                      <AlertTriangle size={12} /> {r}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-slate-500 text-xs mb-2">Transaction Chain</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {trail.data.transactions.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-base-900 border border-base-700 rounded-lg px-3 py-2 text-sm">
                      <div className="text-slate-300">Acct {t.FromAccountID} → Acct {t.ToAccountID}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-mono text-xs">₹{Number(t.Amount).toLocaleString('en-IN')}</span>
                        {t.FlaggedSuspicious ? <span className="badge-risk-high">Flagged</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Recently Flagged Transactions</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flagged?.data?.map((t: any, i: number) => (
              <button
                key={i}
                onClick={() => { setAccountId(String(t.FromAccountID)); setSubmittedId(String(t.FromAccountID)); }}
                className="w-full text-left bg-base-900 border border-base-700 hover:border-risk-high/40 rounded-lg px-3 py-2 text-sm"
              >
                <div className="text-slate-200">₹{Number(t.Amount).toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500">Acct {t.FromAccountID} → Acct {t.ToAccountID}</div>
              </button>
            ))}
            {!flagged?.data?.length && <p className="text-xs text-slate-500">No flagged transactions.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
