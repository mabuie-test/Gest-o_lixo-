 // frontend/src/components/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import { fetchDevices, createDevice, updateDevice, deleteDevice, generateDeviceToken,
         fetchUsers, createUser, updateUser, deleteUser,
         fetchAlerts, ackAlert, fetchTelemetryStats } from '../api';

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({});

  useEffect(()=>{ loadAll(); }, []);

  async function loadAll(){
    try {
      const [ds, us, al] = await Promise.all([fetchDevices(user.token), fetchUsers(user.token), fetchAlerts(user.token)]);
      setDevices(ds || []);
      setUsers(us || []);
      setAlerts(al || []);
    } catch(e){ console.error(e); }
  }

  // Devices actions
  async function onCreateDevice(){
    const payload = { name: deviceForm.name || 'New device', location: deviceForm.location || undefined, config: { telemetryInterval: 1800, alertThreshold: 85 } };
    const d = await createDevice(user.token, payload);
    setDevices(prev => [d, ...prev]);
    setDeviceForm({});
  }
  async function onUpdateDevice(){
    if (!selectedDevice) return;
    const u = await updateDevice(user.token, selectedDevice._id, deviceForm);
    setDevices(prev => prev.map(p=> p._id === u._id ? u : p));
    setSelectedDevice(u);
  }
  async function onDeleteDevice(id){
    if (!confirm('Apagar device?')) return;
    await deleteDevice(user.token, id);
    setDevices(prev => prev.filter(p=> p._id !== id));
  }
  async function onGenerateToken(){
    if (!selectedDevice) return;
    const res = await generateDeviceToken(user.token, selectedDevice._id);
    alert('Device token: ' + res.token);
  }
  async function onLoadDeviceStats(id){
    const stats = await fetchTelemetryStats(id, user.token);
    alert(JSON.stringify(stats, null, 2));
  }

  // Users actions
  const [newUser, setNewUser] = useState({ email:'', password:'', name:'', role:'viewer' });
  async function onCreateUser(){
    await createUser(user.token, newUser);
    setNewUser({ email:'', password:'', name:'', role:'viewer' });
    await loadAll();
  }
  async function onDeleteUser(id){
    if (!confirm('Apagar user?')) return;
    await deleteUser(user.token, id);
    await loadAll();
  }

  // Alerts
  async function onAck(id){
    await ackAlert(user.token, id);
    setAlerts(prev => prev.map(a=> a._id === id ? { ...a, acknowledged: true } : a));
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div><strong>Admin Panel</strong> — {user.user.email} ({user.user.role})</div>
        <div>
          <button onClick={()=>setTab('devices')} disabled={tab==='devices'}>Devices</button>
          <button onClick={()=>setTab('alerts')} disabled={tab==='alerts'} style={{ marginLeft:8 }}>Alerts</button>
          <button onClick={()=>setTab('users')} disabled={tab==='users'} style={{ marginLeft:8 }}>Users</button>
        </div>
      </div>

      <hr/>

      {tab === 'devices' && (
        <div>
          <h4>Devices</h4>
          <div style={{ display:'flex' }}>
            <div style={{ flex:1 }}>
              <ul>
                {devices.map(d=> (
                  <li key={d._id} style={{ marginBottom:6 }}>
                    <strong>{d._id}</strong> — {d.name || 'sem nome'} — {d.status}
                    <div>
                      <button onClick={()=>{ setSelectedDevice(d); setDeviceForm({ name:d.name, config:d.config, location:d.location }) }}>Abrir</button>
                      <button onClick={()=>onDeleteDevice(d._id)} style={{ marginLeft:6 }}>Apagar</button>
                      <button onClick={()=>onLoadDeviceStats(d._id)} style={{ marginLeft:6 }}>Stats</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ width:360, marginLeft:12 }}>
              <h5>{selectedDevice ? 'Editar Device' : 'Novo Device'}</h5>
              <div>
                <input placeholder="Nome" value={deviceForm.name || ''} onChange={e=>setDeviceForm({...deviceForm, name: e.target.value})} />
              </div>
              <div>
                <input placeholder="Lat,Lng ex: 38.72,-9.14" value={deviceForm.location ? deviceForm.location.coordinates.join(',') : ''} onChange={e=>{
                  const v = e.target.value.split(',').map(s=>parseFloat(s.trim()));
                  if (v.length===2 && !v.some(isNaN)) setDeviceForm({...deviceForm, location: { type: 'Point', coordinates: [v[1], v[0]] }});
                  else setDeviceForm({...deviceForm, location: undefined});
                }} />
              </div>
              <div style={{ marginTop:8 }}>
                {!selectedDevice && <button onClick={onCreateDevice}>Criar</button>}
                {selectedDevice && <>
                  <button onClick={onUpdateDevice}>Guardar</button>
                  <button onClick={onGenerateToken} style={{ marginLeft:8 }}>Gerar Token</button>
                </>}
                <button onClick={()=>{ setSelectedDevice(null); setDeviceForm({}); }} style={{ marginLeft:8 }}>Limpar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          <h4>Alerts</h4>
          <ul>
            {alerts.map(a=> (
              <li key={a._id} style={{ marginBottom:8 }}>
                <strong>{a.level}</strong> [{new Date(a.ts).toLocaleString()}] — {a.deviceId} — {a.message} {a.acknowledged ? '(ACK)' : ''}
                <div>
                  {!a.acknowledged && <button onClick={()=>onAck(a._id)}>ACK</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <h4>Users</h4>
          <div>
            <h5>Criar utilizador</h5>
            <input placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser, email:e.target.value})} />
            <input placeholder="Password" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} />
            <input placeholder="Nome" value={newUser.name} onChange={e=>setNewUser({...newUser, name:e.target.value})} />
            <select value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value})}><option>viewer</option><option>operator</option><option>admin</option></select>
            <div><button onClick={onCreateUser}>Criar</button></div>
          </div>

          <hr/>

          <div>
            <h5>Lista de users</h5>
            <ul>
              {users.map(u=> (
                <li key={u._id}>
                  {u.email} — {u.role} — {u.name}
                  <button onClick={()=>onDeleteUser(u._id)} style={{ marginLeft:6 }}>Apagar</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
