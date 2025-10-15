import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { fetchDevices } from '../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export default function MapView({ token }){
  const [devices, setDevices] = useState([]);

  useEffect(()=>{ (async ()=>{ try { const ds = await fetchDevices(token); setDevices(ds || []); } catch(e){ console.error(e); } })(); },[token]);

  useEffect(()=>{
    function onTelemetry(e){ const t = e.detail; setDevices(prev=>{
      const copy = prev.map(d=> d._id === t.deviceId ? { ...d, lastTelemetry: t } : d);
      return copy;
    }); }
    window.addEventListener('telemetry', onTelemetry);
    return ()=> window.removeEventListener('telemetry', onTelemetry);
  },[]);

  // default center fallback
  const center = [38.72, -9.14];

  return (
    <MapContainer center={center} zoom={13} className="leaflet-container" style={{ minHeight: '60vh' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices.map(d=> (
        <Marker key={d._id} position={d.location?.coordinates ? [d.location.coordinates[1], d.location.coordinates[0]] : center}>
          <Popup>
            <div style={{ minWidth:200 }}>
              <strong>{d.name || d._id}</strong>
              <div style={{ color:'#6b7280', fontSize:13 }}>Estado: {d.status}</div>
              <div>Último nível: {d.lastTelemetry?.fillPercent ?? '—'}%</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Bateria: {d.lastTelemetry?.battery_percent ?? '—'}%</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
