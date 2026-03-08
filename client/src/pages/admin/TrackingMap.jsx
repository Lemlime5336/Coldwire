import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, LoadingScreen, EmptyState } from '../../components/ui/UI';
import LiveMap from '../../components/map/LiveMap';
import styles from './Admin.module.css';

export default function TrackingMap() {
  const { api } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/deliveries').then(async r => {
      const active = (r.data || []).filter(d => d.Status === 'In Progress');
      setDeliveries(active);

      const pts = [];
      for (const del of active) {
        try {
          const latest = await api.get(`/api/sensors/${del._id}/latest`);
          if (latest.data?.Latitude) {
            pts.push({
              lat: latest.data.Latitude,
              lng: latest.data.Longitude,
              truckId: del.DelTruckID?.TruckID || del.DelID,
              temp: latest.data.Temperature,
              humidity: latest.data.Humidity,
              time: latest.data.Timestamp,
              active: true,
            });
          }
        } catch {}
      }
      setPoints(pts);
    }).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Live Tracking Map"
        subtitle={`${deliveries.length} delivery${deliveries.length !== 1 ? 's' : ''} in transit`}
      />

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {points.length === 0 ? (
          <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--white-dim)' }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>◎</span>
            <span style={{ fontSize: 13 }}>No active GPS data — trucks may not be transmitting</span>
          </div>
        ) : (
          <LiveMap points={points} height={480} />
        )}
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {deliveries.map(d => (
          <Card key={d._id} style={{ flex: '1 1 240px', minWidth: 220 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: 'var(--ice)', marginBottom: 6 }}>
              {d.DelTruckID?.TruckID || d.DelID}
            </div>
            <div style={{ fontSize: 12, color: 'var(--white-dim)' }}>
              → {d.DelRetID?.RetName || 'Unknown destination'}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <span className="badge badge-amber">
                <span className="dot dot-amber" style={{ animation: 'pulse 2s infinite' }} />
                In Transit
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
