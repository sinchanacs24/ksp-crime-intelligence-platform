import axios from 'axios';

/**
 * Central axios instance. Base URL points at the Catalyst Advanced I/O
 * function's invocation URL (see .env.example VITE_API_BASE_URL).
 * Catalyst's embedded auth SDK attaches the session cookie/token
 * automatically once initialized in AuthContext, so no manual header
 * injection is needed here for standard requests.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/server/api',
  headers: {
    'X-Demo-Mode': import.meta.env.VITE_DEMO_MODE_SECRET || ''
  },
  withCredentials: true,
  timeout: 30000
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error?.response?.data?.error?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ---- Typed helper wrappers per module ----

export const firApi = {
  search: (params: Record<string, unknown>) => api.get('/fir', { params }),
  getById: (id: string | number) => api.get(`/fir/${id}`),
  getTimeline: (id: string | number) => api.get(`/fir/${id}/timeline`),
  getSummary: (id: string | number) => api.get(`/fir/${id}/summary`),
  addTimelineEvent: (id: string | number, body: { eventType: string; description: string }) =>
    api.post(`/fir/${id}/timeline`, body)
};

export const accusedApi = {
  getProfile: (name: string) => api.get('/accused/profile', { params: { name } }),
  getRepeatOffenders: (minCases = 2) => api.get('/accused/repeat-offenders', { params: { minCases } }),
  getOutcomes: (id: string | number) => api.get(`/accused/${id}/outcomes`),
  getSimilarCases: (id: string | number, name: string) =>
    api.get(`/accused/${id}/similar-cases`, { params: { name, caseMasterId: id } }),
  computeRiskScore: (id: string | number, name: string) => api.post(`/accused/${id}/risk-score`, { name }),
  getRiskScore: (id: string | number) => api.get(`/accused/${id}/risk-score`)
};

export const victimApi = {
  getByCase: (caseId: string | number) => api.get(`/victim/case/${caseId}`),
  getDemographics: (params: Record<string, unknown> = {}) => api.get('/victim/demographics', { params }),
  getSocioEconomic: (params: Record<string, unknown> = {}) => api.get('/victim/socio-economic', { params })
};

export const networkApi = {
  getAccusedGraph: (id: string | number, depth = 2) => api.get(`/network/accused/${id}`, { params: { depth } }),
  getOrganizedCrimeGroups: (params: Record<string, unknown> = {}) =>
    api.get('/network/organized-crime-groups', { params }),
  linkNodes: (body: Record<string, unknown>) => api.post('/network/link', body)
};

export const financialApi = {
  getCaseTransactions: (caseId: string | number) => api.get(`/financial/case/${caseId}/transactions`),
  traceMoneyTrail: (accountId: string | number, hops = 3) =>
    api.get(`/financial/trace/${accountId}`, { params: { hops } }),
  getFlagged: (limit = 50) => api.get('/financial/flagged', { params: { limit } })
};

export const analyticsApi = {
  getDashboardSummary: () => api.get('/analytics/dashboard-summary'),
  getCrimeTrend: (params: Record<string, unknown> = {}) => api.get('/analytics/crime-trend', { params }),
  getHeatmap: (params: Record<string, unknown> = {}) => api.get('/analytics/heatmap', { params }),
  getSociologicalInsights: (params: Record<string, unknown> = {}) =>
    api.get('/analytics/sociological-insights', { params })
};

export const predictionApi = {
  getForecasts: (unitId?: string | number) => api.get('/prediction/forecasts', { params: { unitId } }),
  recompute: () => api.post('/prediction/forecasts/recompute')
};

export const chatApi = {
  listConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId: string | number) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (body: { conversationId: number | null; question: string; language: 'en' | 'kn' }) =>
    api.post('/chat/message', body),
  sendVoiceMessage: (body: { conversationId: number | null; audioBase64: string; language: string }) =>
    api.post('/chat/voice-message', body)
};

export const reportsApi = {
  exportChat: (conversationId: string | number) => api.get(`/reports/chat/${conversationId}/export`),
  exportCase: (caseId: string | number) => api.get(`/reports/case/${caseId}/export`)
};

export const adminApi = {
  listUsers: () => api.get('/admin/users'),
  createUser: (body: Record<string, unknown>) => api.post('/admin/users', body),
  changeRole: (userId: string | number, roleId: number) => api.put(`/admin/users/${userId}/role`, { roleId }),
  listRoles: () => api.get('/admin/roles'),
  getPermissions: (roleId: string | number) => api.get(`/admin/permissions/${roleId}`),
  updatePermission: (permissionId: string | number, body: Record<string, unknown>) =>
    api.put(`/admin/permissions/${permissionId}`, body),
  getAuditLogs: (params: Record<string, unknown> = {}) => api.get('/admin/audit-logs', { params })
};

export const authApi = {
  me: () => api.get('/auth/me')
};
