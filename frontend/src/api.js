 // frontend/src/api.js
const BASE = process.env.REACT_APP_API || 'http://localhost:4000/api';

async function fetchJson(url, token, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const r = await fetch(url, { ...opts, headers });
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, body: text ? JSON.parse(text) : null }; }
  catch(e) { return { ok: r.ok, status: r.status, body: text }; }
}

export async function login(email, password){
  const res = await fetchJson(`${BASE}/auth/login`, null, { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(res.body?.message || `HTTP ${res.status}`);
  return res.body;
}

export async function fetchDevices(token){ return (await fetchJson(`${BASE}/devices`, token)).body; }
export async function createDevice(token, payload){ return (await fetchJson(`${BASE}/devices`, token, { method: 'POST', body: JSON.stringify(payload) })).body; }
export async function updateDevice(token, id, payload){ return (await fetchJson(`${BASE}/devices/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })).body; }
export async function deleteDevice(token, id){ return (await fetchJson(`${BASE}/devices/${id}`, token, { method: 'DELETE' })).body; }
export async function generateDeviceToken(token, id){ return (await fetchJson(`${BASE}/devices/${id}/token`, token, { method: 'POST' })).body; }

export async function fetchTelemetry(deviceId, token){ return (await fetchJson(`${BASE}/devices/${deviceId}/telemetry`, token)).body; }
export async function fetchTelemetryStats(deviceId, token, days=7){ return (await fetchJson(`${BASE}/devices/${deviceId}/telemetry/stats?days=${days}`, token)).body; }

export async function fetchUsers(token){ return (await fetchJson(`${BASE}/users`, token)).body; }
export async function createUser(token, payload){ return (await fetchJson(`${BASE}/users`, token, { method: 'POST', body: JSON.stringify(payload) })).body; }
export async function updateUser(token, id, payload){ return (await fetchJson(`${BASE}/users/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })).body; }
export async function deleteUser(token, id){ return (await fetchJson(`${BASE}/users/${id}`, token, { method: 'DELETE' })).body; }

export async function fetchAlerts(token, unack=false){ const q = unack ? '?unack=true' : ''; return (await fetchJson(`${BASE}/alerts${q}`, token)).body; }
export async function ackAlert(token, id){ return (await fetchJson(`${BASE}/alerts/${id}/ack`, token, { method: 'POST' })).body; }
