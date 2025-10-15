 import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';
import { socket } from './socket';

export default function App(){
  const [user, setUser] = useState(null);

  useEffect(()=>{
    socket.on('connect', ()=>console.log('ws connected'));
    socket.on('telemetry', (t)=>{ window.dispatchEvent(new CustomEvent('telemetry', { detail: t })); });
  },[]);

  if (!user) return <Login onLogin={u=>setUser(u)} />;

  return (
    <div>
      <div className="header-band" />
      <header className="app-header">
        <div className="brand">
          <div className="logo"><i className="fa-solid fa-recycle" style={{fontSize:18}}></i></div>
          <div>
            <h1>SmartBins — Gestão de Resíduos</h1>
            <div style={{ fontSize:12, color:'#6b7280' }}>Mapa em tempo real • Monitorização de baterias • Alertas</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn secondary" onClick={()=>{ window.location.reload(); }} title="Recarregar"><i className="fa-solid fa-arrows-rotate"></i> Recarregar</button>
          <div style={{ width:8 }} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:13, color:'#334155' }}>{user.user.email}</div>
            <button className="btn" onClick={()=>{ setUser(null); }}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>
      </header>

      <main className="app-layout">
        <section className="main-map">
          <div className="map-container card">
            <MapView token={user.token} />
          </div>
        </section>

        <aside className="sidebar card" aria-label="Painel administrativo">
          <AdminPanel user={user} />
        </aside>
      </main>
    </div>
  );
}
