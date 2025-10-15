import React, { useEffect, useState, useRef } from 'react';
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

  useEffect(()=>{ (async ()=>{ const ds = await fetchDevices(token); setDevices(ds); })(); },[]);

  useEffect(()=>{
    function onTelemetry(e){ const t = e.detail; setDevices(prev=>{
      const copy = prev.map(d=> d._id === t.deviceId ? { ...d, lastTelemetry: t } : d);
      return copy;
    }); }
    window.addEventListener('telemetry', onTelemetry);
    return ()=> window.removeEventListener('telemetry', onTelemetry);
  },[]);

  return (
    <MapContainer center={[38.72, -9.14]} zoom={13} style={{ height:'100vh' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices.map(d=> (
        <Marker key={d._id} position={d.location?.coordinates ? [d.location.coordinates[1], d.location.coordinates[0]] : [38.72,-9.14]}>
          <Popup>
            <div>
              <strong>{d.name || d._id}</strong>
              <div>Estado: {d.status}</div>
              <div>Last fill: {d.lastTelemetry?.fillPercent ?? '—'}%</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
