 // frontend/src/components/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchDevices, createDevice, updateDevice, deleteDevice, generateDeviceToken,
  fetchUsers, createUser, deleteUser,
  fetchAlerts, ackAlert, fetchTelemetryStats
} from '../api';

export default function AdminPanel({ user }) {
  const [tab, setTab] = useState('devices');

  // devices/users/alerts state
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // device form state (supports incremental coords typing via coordsText)
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', config: {}, coordsText: '', location: undefined });

  // new user form
  const [newUser, setNewUser] = useState({ email:'', password:'', name:'', role:'viewer' });

  useEffect(()=>{ loadAll(); }, []);

  async function loadAll(){
    try {
      const [ds, us, al] = await Promise.all([
        fetchDevices(user.token).catch(()=>[]),
        fetchUsers(user.token).catch(()=>[]),
        fetchAlerts(user.token).catch(()=>[])
      ]);
      setDevices(ds || []);
      setUsers(us || []);
      setAlerts(al || []);
    } catch(e){ console.error('loadAll error', e); }
  }

  // helper: parse coords string "lat,lng" => GeoJSON Point or null
  function parseCoordsText(text) {
    if (!text || typeof text !== 'string') return null;
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].replace(',', '.'));
    const lng = parseFloat(parts[1].replace(',', '.'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { type: 'Point', coordinates: [lng, lat] };
    }
    return null;
  }

  // open device into form
  function openDeviceForEdit(d) {
    setSelectedDevice(d);
    setDeviceForm({
      name: d.name || '',
      config: d.config || { telemetryInterval: 1800, alertThreshold: 85 },
      location: d.location || undefined,
      coordsText: d.location ? `${d.location.coordinates[1]},${d.location.coordinates[0]}` : ''
    });
  }

  // create device
  async function onCreateDevice(){
    const location = parseCoordsText(deviceForm.coordsText);
    const payload = {
      name: deviceForm.name || 'New device',
      location: location || undefined,
      config: deviceForm.config || { telemetryInterval: 1800, alertThreshold: 85 }
    };
    try {
      const d = await createDevice(user.token, payload);
      setDevices(prev => [d, ...prev]);
      setDeviceForm({ name:'', config:{}, coordsText:'', location: undefined });
      // notify map / other components
      window.dispatchEvent(new CustomEvent('devices:updated', { detail: d }));
      alert('Device criado com sucesso');
    } catch(e) {
      console.error('create device error', e);
      alert('Erro ao criar device: ' + (e.message || 'ver logs'));
    }
  }

  // update device
  async function onUpdateDevice(){
    if (!selectedDevice) { alert('Seleciona um device para editar'); return; }
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
      setDeviceForm(prev => ({ ...prev, location: u.location, coordsText: u.location ? `${u.location.coordinates[1]},${u.location.coordinates[0]}` : '' }));
      window.dispatchEvent(new CustomEvent('devices:updated', { detail: u }));
      alert('Device atualizado');
    } catch(e) {
      console.error('update device error', e);
      alert('Erro ao atualizar device: ' + (e.message || 'ver logs'));
    }
  }

  // delete device
  async function onDeleteDevice(id){
    if (!confirm('Apagar device?')) return;
    try {
      await deleteDevice(user.token, id);
      setDevices(prev => prev.filter(p=> p._id !== id));
      if (selectedDevice && selectedDevice._id === id) { setSelectedDevice(null); setDeviceForm({ name:'', config:{}, coordsText:'', location: undefined }); }
      window.dispatchEvent(new CustomEvent('devices:updated', { detail: { _id: id, deleted: true } }));
      alert('Device apagado');
    } catch(e) {
      console.error('delete device error', e);
      alert('Erro ao apagar device');
    }
  }

  // generate token
  async function onGenerateToken(){
    try {
      if (!selectedDevice) return alert('Seleciona um device primeiro');
      const res = await generateDeviceToken(user.token, selectedDevice._id);
      if (!res || !res.token) {
        console.warn('generateDeviceToken returned:', res);
        return alert('Erro: token não gerado (verificar logs do backend).');
      }
      try { await navigator.clipboard.writeText(res.token); } catch(e){}
      alert('Token gerado e copiado para área de transferência:\n' + res.token);
    } catch(e) {
      console.error('token error', e);
      alert('Erro ao gerar token: ' + (e.message || e));
    }
  }

  // load telemetry stats
  async function onLoadDeviceStats(id){
    try {
      const stats = await fetchTelemetryStats(id, user.token);
      alert(JSON.stringify(stats, null, 2));
    } catch(e) {
      console.error('stats error', e);
      alert('Erro ao obter stats');
    }
  }

  // Users
  async function onCreateUser(){
    try {
      await createUser(user.token, newUser);
      setNewUser({ email:'', password:'', name:'', role:'viewer' });
      await loadAll();
      alert('Utilizador criado');
    } catch(e) {
      console.error('create user', e);
      alert('Erro ao criar utilizador');
    }
  }
  async function onDeleteUser(id){
    if (!confirm('Apagar user?')) return;
    try {
      await deleteUser(user.token, id);
      await loadAll();
      alert('Utilizador apagado');
    } catch(e) {
      console.error('delete user', e);
      alert('Erro ao apagar utilizador');
    }
  }

  // Alerts
  async function onAck(id){
    try {
      await ackAlert(user.token, id);
      setAlerts(prev => prev.map(a=> a._id === id ? { ...a, acknowledged: true } : a));
    } catch(e) {
      console.error('ack alert', e);
      alert('Erro ao reconhecer alerta');
    }
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
                    <strong>{d._id}</strong>
                    <div style={{ color:'#6b7280' }}>{d.name || 'sem nome'}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn secondary" onClick={()=>openDeviceForEdit(d)} title="Editar"><i className="fa-solid fa-pen"></i></button>
                    <button className="btn warn" onClick={()=>onDeleteDevice(d._id)} title="Apagar"><i className="fa-solid fa-trash"></i></button>
                    <button className="btn" onClick={()=>onLoadDeviceStats(d._id)} title="Stats"><i className="fa-solid fa-chart-line"></i></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ marginTop:12 }}>
            <h5>{selectedDevice ? 'Editar Device' : 'Novo Device'}</h5>
            <input placeholder="Nome" value={deviceForm.name || ''} onChange={e=>setDeviceForm({...deviceForm, name: e.target.value})} />

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
              <button className="btn secondary" onClick={()=>{ setSelectedDevice(null); setDeviceForm({ name:'', config:{}, coordsText:'', location: undefined }); }} style={{ marginLeft:8 }}>Limpar</button>
            </div>

            <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>
              Dica: escreve as coordenadas como <code>lat,lng</code> (ex.: <em>38.72,-9.14</em>). Só serão aplicadas ao criar/guardar.
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
