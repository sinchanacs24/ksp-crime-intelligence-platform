import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { adminApi } from '../services/api';

/**
 * Audit Logs (module 24) — read-only trail of every mutating action and
 * sensitive read, written by audit.middleware.js on every matching
 * route. Satisfies "secure handling of sensitive data with audit logs
 * and traceability" (problem statement section 10).
 */
export default function AuditLogs() {
  const { data: logs, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 100 }) as any
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Full traceability of data access and modifications across the platform
        </p>
      </div>

      <div className="card">
        {isFetching && <p className="text-xs text-slate-500">Loading audit trail...</p>}
        {!isFetching && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-base-700">
                <th className="pb-2">Event Time</th>
                <th className="pb-2">User ID</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Entity</th>
                <th className="pb-2">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs?.data?.map((log: any, i: number) => (
                <tr key={i} className="border-b border-base-800">
                  <td className="py-2 text-slate-400 text-xs">{new Date(log.EventTime).toLocaleString()}</td>
                  <td className="py-2 text-slate-300">{log.UserID}</td>
                  <td className="py-2"><span className="text-accent text-xs font-mono">{log.Action}</span></td>
                  <td className="py-2 text-slate-400 text-xs">{log.EntityType} #{log.EntityID}</td>
                  <td className="py-2 text-slate-500 text-xs">{log.IPAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isFetching && !logs?.data?.length && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <ScrollText size={32} />
            <p className="text-sm mt-2">No audit events recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
