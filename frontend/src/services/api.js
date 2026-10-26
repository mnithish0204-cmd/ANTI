const BASE_URL = 'http://127.0.0.1:8000';

export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData vs JSON
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network request failed' }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),

  // Reports
  createReport: (formData) => request('/api/reports', { method: 'POST', body: formData }),
  validateImage: (formData) => request('/api/reports/validate-image', { method: 'POST', body: formData }),
  getMyReports: (type) => request(`/api/reports/my${type ? `?report_type=${type}` : ''}`),
  getAllReports: (params = '') => request(`/api/reports/all${params}`),
  getReport: (id) => request(`/api/reports/${id}`),

  // Matches
  getMatches: (classification, status) => {
    const query = new URLSearchParams();
    if (classification) query.append('classification', classification);
    if (status) query.append('match_status', status);
    const qs = query.toString();
    return request(`/api/matches${qs ? `?${qs}` : ''}`);
  },
  getMatchDetail: (id) => request(`/api/matches/${id}`),
  confirmMatch: (id) => request(`/api/matches/${id}/confirm`, { method: 'POST' }),
  rejectMatch: (id) => request(`/api/matches/${id}/reject`, { method: 'POST' }),
  requestConfirmation: (id) => request(`/api/matches/${id}/request-confirmation`, { method: 'POST' }),
  verifyOwnership: (id, attributeDetail) => request(`/api/matches/${id}/verify-ownership`, { 
    method: 'POST', 
    body: JSON.stringify({ attribute_detail: attributeDetail }) 
  }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  getUnreadCount: () => request('/api/notifications/unread-count'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'POST' }),

  // Admin & Evaluation
  getAnalytics: () => request('/api/admin/analytics'),
  getConfig: () => request('/api/admin/config'),
  updateConfig: (data) => request('/api/admin/config', { method: 'PUT', body: JSON.stringify(data) }),
  getEvaluation: (threshold = 0.60) => request(`/api/admin/evaluation?threshold=${threshold}`),
  deleteReport: (id) => request(`/api/admin/reports/${id}`, { method: 'DELETE' }),

  // Helpers
  getImageUrl: (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    // Normalize windows backslashes
    const normalized = imagePath.replace(/\\/g, '/');
    const filename = normalized.split('/').pop();
    return `http://127.0.0.1:8000/uploads/${filename}`;
  }
};
