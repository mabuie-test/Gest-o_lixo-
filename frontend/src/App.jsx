import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import MapView from './components/MapView';
import AdminPanel from './components/AdminPanel';
import { socket } from './socket';

export default function App(){
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <div className="logo"><i className="fa-solid fa-recycle" style={{fontSize:18}} /></div>
          <div>
            <h1>SmartBins — Gestão de Resíduos</h1>
            <div style={{ fontSize:12, color:'#6b7280' }}>Mapa em tempo real • Monitorização de baterias • Alertas</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn secondary" onClick={()=>{ window.location.reload(); }} title="Recarregar">
            <i className="fa-solid fa-arrows-rotate" /> Recarregar
          </button>

          <button
            className="btn secondary"
            onClick={()=>setSidebarCollapsed(s=>!s)}
            title={sidebarCollapsed ? 'Abrir painel' : 'Fechar painel'}
            style={{ marginLeft:8 }}
          >
            <i className={`fa-solid ${sidebarCollapsed ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
          </button>

          <div style={{ width:8 }} />

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:13, color:'#334155' }}>{user.user.email}</div>
            <button className="btn" onClick={()=>{ setUser(null); }}><i className="fa-solid fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>
      </header>

      <main className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <section className="main-map">
          <div className="map-wrapper card">
            <MapView token={user.token} sidebarCollapsed={sidebarCollapsed} />
          </div>
        </section>

        <aside className={`sidebar card ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Painel administrativo">
          <AdminPanel user={user} />
        </aside>
      </main>
    </div>
  );
}
