const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const getToken = () => localStorage.getItem('qr_token');
export const setToken = (t) => localStorage.setItem('qr_token', t);
export const clearToken = () => localStorage.removeItem('qr_token');

async function raw(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network down, server asleep, CORS problem, etc.
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired, please log in again');
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res;
}

const json = async (path, opts) => (await raw(path, opts)).json();

export const api = {
  login: (username, password) => json('/auth/login', { method: 'POST', body: { username, password } }),
  stats: () => json('/stats'),
  companies: (search = '') => json(`/companies?search=${encodeURIComponent(search)}`),
  company: (id) => json(`/companies/${id}`),
  createCompany: (data) => json('/companies', { method: 'POST', body: data }),
  addInvitations: (id, count) => json(`/companies/${id}/invitations`, { method: 'POST', body: { count } }),
  deleteCompany: (id) => json(`/companies/${id}`, { method: 'DELETE' }),
  invitations: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, v);
    });
    return json(`/invitations?${q.toString()}`);
  },
  scan: (token) => json('/scan', { method: 'POST', body: { token } }),
  scans: (status = '') => json(`/scans?limit=300${status ? `&status=${status}` : ''}`),
  download: async (path, filename) => {
    const res = await raw(path);
    const blob = await res.blob();
    saveBlob(blob, filename);
  },
};

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
