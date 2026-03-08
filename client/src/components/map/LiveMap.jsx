import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LiveMap({ points = [], height = 400 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [3.1390, 101.6869],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup is at the top level — React receives it correctly
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers whenever points change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (points.length === 0) return;

    points.forEach(pt => {
      if (!pt.lat || !pt.lng) return;

      const icon = L.divIcon({
        html: `<div style="
          width:12px;height:12px;border-radius:50%;
          background:${pt.active ? '#5bc4e8' : '#8fa5c4'};
          border:2px solid ${pt.active ? '#fff' : '#8fa5c4'};
          box-shadow:${pt.active ? '0 0 10px rgba(91,196,232,0.8)' : 'none'};
        "></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;line-height:1.6;color:#0a0f1e">
            <strong>${pt.truckId || 'Truck'}</strong><br/>
            ${pt.temp ? `🌡 ${pt.temp}°C` : ''}
            ${pt.humidity ? ` 💧 ${pt.humidity}%` : ''}<br/>
            ${pt.time ? new Date(pt.time).toLocaleTimeString('en-MY') : ''}
          </div>
        `);

      markersRef.current.push(marker);
    });

    const valid = points.filter(p => p.lat && p.lng);
    if (valid.length > 1) {
      map.fitBounds(valid.map(p => [p.lat, p.lng]), { padding: [40, 40] });
    } else if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 13);
    }
  }, [points]); // Runs on mount (after map init) and on every points update

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--navy-700)',
      }}
    />
  );
}