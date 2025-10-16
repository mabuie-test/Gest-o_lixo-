import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchDevices } from '../api';
import { socket } from '../socket';

// leaflet icon defaults
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// small component to access map instance and run effects
function MapController({ mapRef, onTileLoading, onTileLoad, devices }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;

    // attach events to existing tile layers
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        layer.on('loading', onTileLoading);
        layer.on('load', onTileLoad);
      }
    });

    return () => {
      try {
        map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            layer.off('loading', onTileLoading);
            layer.off('load', onTileLoad);
          }
        });
      } catch (e) {}
    };
  }, [map]);

  // when devices change, adjust view
  useEffect(() => {
    try {
      if (!map) return;
      const pts = devices
        .filter(d => d.location && Array.isArray(d.location.coordinates))
        .map(d => [d.location.coordinates[1], d.location.coordinates[0]]);
      if (pts.length === 0) return;
      if (pts.length === 1) {
        map.setView(pts[0], 15, { animate: true });
      } else {
        const bounds = L.latLngBounds(pts);
        map.fitBounds(bounds.pad(0.15), { animate: true, maxZoom: 16 });
      }
    } catch(e){ console.warn('fitBounds error', e); }
  }, [devices, map]);

  return null;
}

export default function MapView({ token, sidebarCollapsed }) {
  const [devices, setDevices] = useState([]);
  const [loadingTiles, setLoadingTiles] = useState(true);
  const wrapperRef = useRef(null);
  const mapRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ds = await fetchDevices(token);
        if (mounted) setDevices(ds || []);
        // small delay then invalidate to force tile load
        setTimeout(()=>invalidateMap(), 250);
      } catch (e) {
        console.error('fetchDevices', e);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  // socket/device events update
  useEffect(() => {
    function handleDeviceUpdate(d) {
      const dev = d.detail || d;
      setDevices(prev => {
        const exists = prev.some(p => p._id === dev._id);
        if (exists) return prev.map(p => p._id === dev._id ? dev : p);
        return [dev, ...prev];
      });
      // ensure map redraw
      setTimeout(()=>invalidateMap(), 200);
    }

    socket.on('device:update', handleDeviceUpdate);
    socket.on('device:created', handleDeviceUpdate);
    socket.on('device:deleted', (payload) => {
      const id = payload && payload._id ? payload._id : payload;
      setDevices(prev => prev.filter(p => p._id !== id));
      setTimeout(()=>invalidateMap(), 200);
    });
    window.addEventListener('devices:updated', handleDeviceUpdate);

    return () => {
      socket.off('device:update', handleDeviceUpdate);
      socket.off('device:created', handleDeviceUpdate);
      socket.off('device:deleted', handleDeviceUpdate);
      window.removeEventListener('devices:updated', handleDeviceUpdate);
    };
  }, []);

  // resize observer to call invalidateSize when wrapper changes
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();

    resizeObserverRef.current = new ResizeObserver(() => {
      invalidateMap();
    });
    resizeObserverRef.current.observe(el);

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    };
  }, [sidebarCollapsed]);

  // invalidate and optionally redraw tiles
  function invalidateMap() {
    try {
      const map = mapRef.current;
      if (!map) return;
      try { map.invalidateSize(); } catch(e){}
      // request tile redraw on tile layers (robust)
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer && typeof layer.redraw === 'function') {
          try { layer.redraw(); } catch(e){}
        }
      });
    } catch (e) { console.warn('invalidateMap', e); }
  }

  // tile loading handlers
  function handleTileLoading() { setLoadingTiles(true); }
  function handleTileLoad() { setLoadingTiles(false); }

  // hide spinner shortly after first load
  useEffect(()=> {
    if (!loadingTiles) {
      const t = setTimeout(()=> setLoadingTiles(false), 300);
      return ()=> clearTimeout(t);
    }
  }, [loadingTiles]);

  // basic center fallback
  const center = [38.72, -9.14];

  return (
    <div ref={wrapperRef} className="map-container" style={{ position:'relative', minHeight: '320px' }}>
      {loadingTiles && (
        <div className="map-spinner">
          <div className="spinner" />
          <div style={{ marginTop:8, color:'#475569' }}>Carregando mapa…</div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        className="leaflet-container"
        whenCreated={mapInstance => { mapRef.current = mapInstance; setTimeout(invalidateMap, 200); }}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // add crossOrigin to avoid some CORS issues in certain hosts
          crossOrigin={true}
          // react-leaflet TileLayer will be attached and events picked by MapController
        />
        <MapController
          mapRef={mapRef}
          onTileLoading={handleTileLoading}
          onTileLoad={handleTileLoad}
          devices={devices}
        />
        {devices.map(d => (
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
    </div>
  );
}
