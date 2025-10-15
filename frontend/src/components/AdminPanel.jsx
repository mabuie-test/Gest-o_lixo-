 import React, { useEffect, useState } from 'react';
import { fetchDevices } from '../api';

export default function AdminPanel({ user }){
  const [devices, setDevices] = useState([]);
  useEffect(()=>{ (async ()=>{ const ds = await fetchDevices(user.token); setDevices(ds); })(); },[]);
  return (
    <div style={{ padding:12 }}>
      <h3>Admin Panel</h3>
      <div>Logado: {user.user.email} ({user.user.role})</div>
      <hr />
      <h4>Devices</h4>
      <ul>
        {devices.map(d=> <li key={d._id}>{d._id} — {d.name || 'sem nome'} — {d.status}</li>)}
      </ul>
    </div>
  );
}
