import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Check, X } from 'lucide-react';
import { adminApi } from '../services/api';

/**
 * Admin Panel (module 25) covering User Management (21) and
 * Role-Based Access (22). Permission toggles write directly to the
 * Permission table via admin.routes.js, so RBAC changes take effect
 * immediately without a redeploy.
 */
/**
 * Catalyst Data Store returns boolean-like columns as the strings
 * "1"/"0" (or sometimes real true/false), not JS booleans. Both "1"
 * and "0" are truthy as plain strings, so `p[field] ? ... : ...`
 * always evaluated true regardless of the actual value — this
 * normalizes it properly before use.
 */
function isTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export default function Admin() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers() as any });
  const { data: roles } = useQuery({ queryKey: ['admin-roles'], queryFn: () => adminApi.listRoles() as any });
  const { data: permissions } = useQuery({
    queryKey: ['admin-permissions', selectedRoleId],
    queryFn: () => adminApi.getPermissions(selectedRoleId as number) as any,
    enabled: !!selectedRoleId
  });

  const togglePermission = useMutation({
    mutationFn: ({ permissionId, field, value }: { permissionId: number; field: string; value: boolean }) =>
      adminApi.updatePermission(permissionId, { [field]: value }) as any,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-permissions', selectedRoleId] })
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Admin Panel</h1>
        <p className="text-sm text-slate-500 mt-1">User management, roles, and permission governance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <ShieldCheck size={16} /> Roles
          </h2>
          <div className="space-y-2">
            {roles?.data?.map((r: any) => (
              <button
                key={r.RoleID}
                onClick={() => setSelectedRoleId(r.RoleID)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedRoleId === r.RoleID ? 'bg-accent/15 border border-accent/40 text-accent' : 'bg-base-900 border border-base-700 text-slate-300'
                }`}
              >
                {r.RoleName}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Module Permissions</h2>
          {!selectedRoleId && <p className="text-xs text-slate-500">Select a role to view/edit permissions.</p>}
          {selectedRoleId && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-base-700">
                  <th className="pb-2">Module</th>
                  <th className="pb-2 text-center">Read</th>
                  <th className="pb-2 text-center">Write</th>
                  <th className="pb-2 text-center">Export</th>
                </tr>
              </thead>
              <tbody>
                {permissions?.data?.map((p: any) => (
                  <tr key={p.ROWID} className="border-b border-base-800">
                    <td className="py-2 text-slate-300">{p.Module}</td>
                    {(['CanRead', 'CanWrite', 'CanExport'] as const).map((field) => (
                      <td key={field} className="py-2 text-center">
                        <button
                          onClick={() => togglePermission.mutate({ permissionId: p.ROWID, field, value: !isTruthy(p[field]) })}
                          className={`mx-auto flex items-center justify-center w-6 h-6 rounded ${
                            isTruthy(p[field]) ? 'bg-risk-low/20 text-risk-low' : 'bg-base-700 text-slate-600'
                          }`}
                        >
                          {isTruthy(p[field]) ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">System Users</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-base-700">
              <th className="pb-2">Name</th>
              <th className="pb-2">KGID</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users?.data?.map((u: any, i: number) => (
              <tr key={i} className="border-b border-base-800">
                <td className="py-2 text-slate-300">{u.Employee.FirstName}</td>
                <td className="py-2 text-slate-500 font-mono text-xs">{u.Employee.KGID}</td>
                <td className="py-2 text-slate-300">{u.Role.RoleName}</td>
                <td className="py-2 text-slate-500 text-xs">{u.AppUser.LastLogin ? new Date(u.AppUser.LastLogin).toLocaleString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
