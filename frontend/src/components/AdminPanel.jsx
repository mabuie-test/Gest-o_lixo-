import React, { useEffect, useState } from 'react';
import { fetchDevices, createDevice, updateDevice, deleteDevice, generateDeviceToken,
         fetchUsers, createUser, deleteUser,
         fetchAlerts, ackAlert, fetchTelemetryStats } from '../api';

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({}); // will hold name, config, location, coordsText

  useEffect(()=>{ loadAll(); }, []);

  async function loadAll(){
    try {
      const [ds, us, al] = await Promise.all([fetchDevices(user.token), fetchUsers(user.token), fetchAlerts(user.token)]);
      setDevices(ds || []);
      setUsers(us || []);
      setAlerts(al || []);
    } catch(e){ console.error(e); }
  }

  // helper: try to parse coordsText string "lat,lng" into location object
  function parseCoordsText(text) {
    if (!text || typeof text !== 'string') return null;
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].replace(',', '.'));
    const lng = parseFloat(parts[1].replace(',', '.'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // store as GeoJSON Point: coordinates: [lng, lat]
      return { type: 'Point', coordinates: [lng, lat] };
    }
    return null;
  }

  // Devices actions
  async function onCreateDevice(){
    // parse coordsText if present
    const location = parseCoordsText(deviceForm.coordsText);
    const payload = {
      name: deviceForm.name || 'New device',
      location: location || undefined,
      config: deviceForm.config || { telemetryInterval: 1800, alertThreshold: 85 }
    };
    try {
      const d = await createDevice(user.token, payload);
      setDevices(prev => [d, ...prev]);
      setDeviceForm({});
    } catch(e) { console.error('create device error', e); alert('Erro ao criar device'); }
  }

  async function onUpdateDevice(){
    if (!selectedDevice) return;
    const location = parseCoordsText(deviceForm.coordsText);
    const payload = {
      name: deviceForm.name,
      config: deviceForm.config,
      location: location || deviceForm.location || undefined
    };
    try {
      const u = await updateDevice(user.token, selectedDevice._id, payload);
      setDevices(prev => prev.map(p=> p._id === u._id ? u : p));
      setSelectedDevice(u);
      // sync coordsText with updated location
      setDeviceForm(prev => ({ ...prev, location: u.location, coordsText: u.location ? `${u.location.coordinates[1]},${u.location.coordinates[0]}` : '' }));
    } catch(e) { console.error('update device error', e); alert('Erro ao atualizar device'); }
  }

  async function onDeleteDevice(id){
    if (!confirm('Apagar device?')) return;
    await deleteDevice(user.token, id);
    setDevices(prev => prev.filter(p=> p._id !== id));
    if (selectedDevice && selectedDevice._id === id) {
      setSelectedDevice(null);
      setDeviceForm({});
    }
  }

  async function onGenerateToken(){
    if (!selectedDevice) return;
    const res = await generateDeviceToken(user.token, selectedDevice._id);
    alert('Device token: ' + res.token);
  }

  async function onLoadDeviceStats(id){
    try {
      const stats = await fetchTelemetryStats(id, user.token);
      alert(JSON.stringify(stats, null, 2));
    } catch(e){ console.error(e); alert('Erro ao obter stats'); }
  }

  // Users actions
  const [newUser, setNewUser] = useState({ email:'', password:'', name:'', role:'viewer' });
  async function onCreateUser(){
    try {
      await createUser(user.token, newUser);
      setNewUser({ email:'', password:'', name:'', role:'viewer' });
      await loadAll();
    } catch(e){ console.error('create user', e); alert('Erro ao criar user'); }
  }
  async function onDeleteUser(id){
    if (!confirm('Apagar user?')) return;
    await deleteUser(user.token, id);
    await loadAll();
  }

  // Alerts
  async function onAck(id){
    try {
      await ackAlert(user.token, id);
      setAlerts(prev => prev.map(a=> a._id === id ? { ...a, acknowledged: true } : a));
    } catch(e){ console.error(e); alert('Erro ao reconhecer alerta'); }
  }

  // when user selects a device to edit, populate deviceForm and coordsText
  function openDeviceForEdit(d) {
    setSelectedDevice(d);
    setDeviceForm({
      name: d.name || '',
      config: d.config || { telemetryInterval:1800, alertThreshold:85 },
      location: d.location || undefined,
      coordsText: d.location ? `${d.location.coordinates[1]},${d.location.coordinates[0]}` : ''
    });
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button className={`btn ${tab==='devices' ? '' : 'secondary'}`} onClick={()=>setTab('devices')}><i className="fa-solid fa-boxes-stacked"></i> Devices</button>
        <button className={`btn ${tab==='alerts' ? '' : 'secondary'}`} onClick={()=>setTab('alerts')}><i className="fa-solid fa-bell"></i> Alerts</button>
        <button className={`btn ${tab==='users' ? '' : 'secondary'}`} onClick={()=>setTab('users')}><i className="fa-solid fa-users"></i> Users</button>
      </div>

      {tab === 'devices' && (
        <div>
          <div className="card">
            <h4>Dispositivos</h4>
            <ul className="device-list">
              {devices.map(d=> (
                <li key={d._id}>
                  <div>
                    <strong>{d._id}</strong> <div style={{ color:'#6b7280' }}>{d.name || 'sem nome'}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn secondary" onClick={()=>openDeviceForEdit(d)}><i className="fa-solid fa-pen"></i></button>
                    <button className="btn warn" onClick={()=>onDeleteDevice(d._id)}><i className="fa-solid fa-trash"></i></button>
                    <button className="btn" onClick={()=>onLoadDeviceStats(d._id)}><i className="fa-solid fa-chart-line"></i></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ marginTop:12 }}>
            <h5>{selectedDevice ? 'Editar Device' : 'Novo Device'}</h5>
            <input placeholder="Nome" value={deviceForm.name || ''} onChange={e=>setDeviceForm({...deviceForm, name: e.target.value})} />

            {/* coords input controlled by coordsText to allow incremental typing */}
            <input
              placeholder="Lat,Lng ex: 38.72,-9.14"
              value={deviceForm.coordsText || ''}
              onChange={e=>setDeviceForm({...deviceForm, coordsText: e.target.value})}
              style={{ marginTop:8 }}
            />
            <div style={{ marginTop:10 }}>
              {!selectedDevice && <button className="btn" onClick={onCreateDevice}>Criar</button>}
              {selectedDevice && <>
                <button className="btn" onClick={onUpdateDevice}>Guardar</button>
                <button className="btn" style={{ marginLeft:8 }} onClick={onGenerateToken}><i className="fa-solid fa-key"></i> Gerar Token</button>
              </>}
              <button className="btn secondary" onClick={()=>{ setSelectedDevice(null); setDeviceForm({}); }} style={{ marginLeft:8 }}>Limpar</button>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>
              Dica: escreve as coordenadas como <code>lat,lng</code> (ex.: <em>38.72,-9.14</em>) e só serão aplicadas quando criares/guardares.
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          <h4>Alerts</h4>
          <div>
            {alerts.map(a=> (
              <div key={a._id} className={`alert-item ${a.level === 'critical' ? 'critical' : a.level === 'warning' ? 'warning' : ''} card`} style={{ marginTop:8 }}>
                <div>
                  <div style={{ fontWeight:700 }}>{a.message}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>{a.deviceId} • {new Date(a.ts).toLocaleString()}</div>
                </div>
                <div>
                  {!a.acknowledged && <button className="btn" onClick={()=>onAck(a._id)}><i className="fa-solid fa-check"></i> ACK</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <h4>Utilizadores</h4>

          <div className="card">
            <h5>Criar utilizador</h5>
            <input placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser, email:e.target.value})} />
            <input placeholder="Password" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} style={{ marginTop:8 }} />
            <input placeholder="Nome" value={newUser.name} onChange={e=>setNewUser({...newUser, name:e.target.value})} style={{ marginTop:8 }} />
            <select value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value})} style={{ marginTop:8 }}>
              <option value="viewer">viewer</option>
              <option value="operator">operator</option>
              <option value="admin">admin</option>
            </select>
            <div style={{ marginTop:10 }}><button className="btn" onClick={onCreateUser}>Criar</button></div>
          </div>

          <div style={{ marginTop:12 }} className="card">
            <h5>Lista de users</h5>
            <ul style={{ listStyle:'none', padding:0 }}>
              {users.map(u=> (
                <li key={u._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px dashed rgba(0,0,0,0.03)' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{u.email}</div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>{u.role} • {u.name}</div>
                  </div>
                  <div>
                    <button className="btn warn" onClick={()=>onDeleteUser(u._id)}><i className="fa-solid fa-trash"></i></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

    </div>
  );
}
