'use strict';

/**
 * Baseline RBAC permission matrix, keyed by RoleID (see schema.sql Role
 * table) and Module (see functions/api/src/config/constants.js MODULES).
 * Loaded by the seed job to populate the Permission table so RBAC works
 * out of the box without manual console configuration.
 */

const ROLE_IDS = {
  INVESTIGATOR: 1,
  ANALYST: 2,
  SENIOR_OFFICER: 3,
  SUPERVISOR: 4,
  SCRB: 5,
  POLICY_MAKER: 6,
  ADMIN: 7
};

const MODULES = [
  'dashboard', 'fir_search', 'criminal_search', 'victim_search',
  'network_analysis', 'analytics', 'prediction', 'financial_crime',
  'ai_assistant', 'admin_panel', 'audit_logs'
];

// [CanRead, CanWrite, CanExport] per role per module.
const MATRIX = {
  [ROLE_IDS.INVESTIGATOR]: {
    dashboard: [1, 0, 0], fir_search: [1, 1, 1], criminal_search: [1, 1, 0],
    victim_search: [1, 1, 0], network_analysis: [1, 0, 0], analytics: [1, 0, 0],
    prediction: [1, 0, 0], financial_crime: [1, 0, 0], ai_assistant: [1, 0, 1],
    admin_panel: [0, 0, 0], audit_logs: [0, 0, 0]
  },
  [ROLE_IDS.ANALYST]: {
    dashboard: [1, 0, 0], fir_search: [1, 0, 1], criminal_search: [1, 0, 1],
    victim_search: [1, 0, 1], network_analysis: [1, 0, 1], analytics: [1, 0, 1],
    prediction: [1, 0, 1], financial_crime: [1, 0, 1], ai_assistant: [1, 0, 1],
    admin_panel: [0, 0, 0], audit_logs: [0, 0, 0]
  },
  [ROLE_IDS.SENIOR_OFFICER]: {
    dashboard: [1, 0, 0], fir_search: [1, 0, 1], criminal_search: [1, 0, 1],
    victim_search: [1, 0, 1], network_analysis: [1, 0, 1], analytics: [1, 0, 1],
    prediction: [1, 0, 1], financial_crime: [1, 0, 1], ai_assistant: [1, 0, 1],
    admin_panel: [0, 0, 0], audit_logs: [1, 0, 0]
  },
  [ROLE_IDS.SUPERVISOR]: {
    dashboard: [1, 0, 0], fir_search: [1, 1, 1], criminal_search: [1, 1, 1],
    victim_search: [1, 1, 1], network_analysis: [1, 0, 1], analytics: [1, 0, 1],
    prediction: [1, 0, 1], financial_crime: [1, 0, 1], ai_assistant: [1, 0, 1],
    admin_panel: [1, 0, 0], audit_logs: [1, 0, 0]
  },
  [ROLE_IDS.SCRB]: {
    dashboard: [1, 0, 0], fir_search: [1, 0, 1], criminal_search: [1, 0, 1],
    victim_search: [1, 0, 1], network_analysis: [1, 0, 1], analytics: [1, 0, 1],
    prediction: [1, 0, 1], financial_crime: [1, 0, 1], ai_assistant: [1, 0, 1],
    admin_panel: [0, 0, 0], audit_logs: [1, 0, 1]
  },
  [ROLE_IDS.POLICY_MAKER]: {
    dashboard: [1, 0, 0], fir_search: [0, 0, 0], criminal_search: [0, 0, 0],
    victim_search: [0, 0, 0], network_analysis: [0, 0, 0], analytics: [1, 0, 1],
    prediction: [1, 0, 1], financial_crime: [0, 0, 0], ai_assistant: [1, 0, 1],
    admin_panel: [0, 0, 0], audit_logs: [0, 0, 0]
  },
  [ROLE_IDS.ADMIN]: MODULES.reduce((acc, m) => ({ ...acc, [m]: [1, 1, 1] }), {})
};

function buildPermissionRows() {
  const rows = [];
  let id = 1;
  Object.entries(MATRIX).forEach(([roleId, modules]) => {
    Object.entries(modules).forEach(([module, [read, write, exportPerm]]) => {
      rows.push({
        PermissionID: id++,
        RoleID: Number(roleId),
        Module: module,
        CanRead: read,
        CanWrite: write,
        CanExport: exportPerm
      });
    });
  });
  return rows;
}

module.exports = { ROLE_IDS, MODULES, buildPermissionRows };
