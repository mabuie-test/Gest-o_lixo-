 const BASE = process.env.REACT_APP_API || 'http://localhost:4000/api';

export async function login(email, password){
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error('Falha login');
  return r.json();
}

export async function fetchDevices(token){
  const r = await fetch(`${BASE}/devices`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

export async function fetchTelemetry(deviceId, token){
  const r = await fetch(`${BASE}/devices/${deviceId}/telemetry`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}
