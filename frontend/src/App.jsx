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
    <div style={{ height: '100vh', display:'flex' }}>
      <div style={{ flex:1 }}><MapView token={user.token} /></div>
      <div style={{ width:360, borderLeft:'1px solid #ddd' }}>
        <AdminPanel user={user} />
      </div>
    </div>
  );
}
