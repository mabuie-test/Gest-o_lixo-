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

  if (!user) return <Log
