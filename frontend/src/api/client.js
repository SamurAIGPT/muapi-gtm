const BASE_URL = '';

async function fetchJson(url, options = {}) {
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!resp.ok) {
    let errDetail = resp.statusText;
    try {
      const errJson = await resp.json();
      errDetail = errJson.detail || errJson.error || JSON.stringify(errJson);
    } catch (_) {}
    throw new Error(errDetail || `HTTP ${resp.status}`);
  }

  return resp.json();
}

export const api = {
  // ── Workbooks ──
  getWorkbooks: () => fetchJson('/api/workbooks'),
  createWorkbook: (data) => fetchJson('/api/workbooks', { method: 'POST', body: JSON.stringify(data) }),
  getWorkbook: (id) => fetchJson(`/api/workbooks/${id}`),
  deleteWorkbook: (id) => fetchJson(`/api/workbooks/${id}`, { method: 'DELETE' }),

  // ── Rows ──
  getRows: (workbookId, offset = 0, limit = 500) => fetchJson(`/api/workbooks/${workbookId}/rows?offset=${offset}&limit=${limit}`),
  addRow: (workbookId, data) => fetchJson(`/api/workbooks/${workbookId}/rows`, { method: 'POST', body: JSON.stringify({ data }) }),
  updateCell: (workbookId, rowId, field, value, isEnrichment = false) =>
    fetchJson(`/api/workbooks/${workbookId}/rows/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify({ field, value, is_enrichment: isEnrichment }),
    }),
  deleteRow: (workbookId, rowId) => fetchJson(`/api/workbooks/${workbookId}/rows/${rowId}`, { method: 'DELETE' }),

  // ── Columns ──
  addColumn: (workbookId, col) => fetchJson(`/api/workbooks/${workbookId}/columns`, { method: 'POST', body: JSON.stringify(col) }),
  updateColumn: (workbookId, colId, patch) => fetchJson(`/api/workbooks/${workbookId}/columns/${colId}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteColumn: (workbookId, colId) => fetchJson(`/api/workbooks/${workbookId}/columns/${colId}`, { method: 'DELETE' }),

  // ── Execution ──
  runColumn: (workbookId, columnId, rowIds = null) =>
    fetchJson(`/api/workbooks/${workbookId}/run-column`, {
      method: 'POST',
      body: JSON.stringify({ column_id: columnId, row_ids: rowIds }),
    }),
  runCell: (workbookId, rowId, columnId) =>
    fetchJson(`/api/workbooks/${workbookId}/run-cell`, {
      method: 'POST',
      body: JSON.stringify({ row_id: rowId, column_id: columnId }),
    }),

  // ── CSV Import / Export ──
  importCsv: async (workbookId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch(`/api/workbooks/${workbookId}/import-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!resp.ok) throw new Error('Failed to import CSV');
    return resp.json();
  },
  getExportCsvUrl: (workbookId) => `/api/workbooks/${workbookId}/export-csv`,

  // ── Global Leads ──
  getLeads: (search = '', status = '') => fetchJson(`/api/leads?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
  createLead: (data) => fetchJson('/api/leads', { method: 'POST', body: JSON.stringify(data) }),

  // ── Signals ──
  getSignals: () => fetchJson('/api/signals'),
  scanDomain: (domain, companyName = '') => fetchJson('/api/signals/scan', { method: 'POST', body: JSON.stringify({ domain, company_name: companyName }) }),

  // ── Automations ──
  getAutomations: () => fetchJson('/api/automations'),
  createAutomation: (data) => fetchJson('/api/automations', { method: 'POST', body: JSON.stringify(data) }),
  toggleAutomation: (id) => fetchJson(`/api/automations/${id}/toggle`, { method: 'POST' }),
  deleteAutomation: (id) => fetchJson(`/api/automations/${id}`, { method: 'DELETE' }),

  // ── Multimodal Outreach ──
  generateOutreach: (data) => fetchJson('/api/outreach/generate', { method: 'POST', body: JSON.stringify(data) }),

  // ── Audiences ──
  getAudiences: () => fetchJson('/api/audiences'),
  createAudience: (data) => fetchJson('/api/audiences', { method: 'POST', body: JSON.stringify(data) }),
  getAudience: (id) => fetchJson(`/api/audiences/${id}`),
  refreshAudience: (id) => fetchJson(`/api/audiences/${id}/refresh`, { method: 'POST' }),
  deleteAudience: (id) => fetchJson(`/api/audiences/${id}`, { method: 'DELETE' }),

  // ── Watches ──
  getWatches: () => fetchJson('/api/watches'),
  createWatch: (data) => fetchJson('/api/watches', { method: 'POST', body: JSON.stringify(data) }),
  scanWatch: (id) => fetchJson(`/api/watches/${id}/scan`, { method: 'POST' }),
  deleteWatch: (id) => fetchJson(`/api/watches/${id}`, { method: 'DELETE' }),

  // ── Analytics ──
  getAnalyticsOverview: () => fetchJson('/api/analytics/overview'),
  getAnalyticsPipeline: () => fetchJson('/api/analytics/pipeline'),

  // ── AI Copilot Chat ──
  getChatHistory: (sessionId = 'default') => fetchJson(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`),
  sendChatMessage: (message, sessionId = 'default') =>
    fetchJson('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  // ── Settings ──
  getSettings: () => fetchJson('/api/settings'),
  updateSettings: (data) => fetchJson('/api/settings', { method: 'POST', body: JSON.stringify(data) }),
  testConnection: () => fetchJson('/api/settings/test-connection', { method: 'POST' }),
};
