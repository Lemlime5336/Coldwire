import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, EmptyState, LoadingScreen, StatCard } from '../../components/ui/UI';
import LiveMap from '../../components/map/LiveMap';
import styles from '../admin/Admin.module.css';

export default function DriverTrackingMap() {
  const { api } = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [point, setPoint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/deliveries').then(async r => {
      const active = (r.data || []).find(d => d.Status === 'In Progress');
      setDelivery(active || null);
      if (active) {
        try {
          const latest = await api.get(`/api/sensors/${active._id}/latest`);
          if (latest.data?.Latitude) {
            setPoint({
              lat: latest.data.Latitude,
              lng: latest.data.Longitude,
              truckId: active.DelTruckID?.TruckID || active.DelID,
              temp: latest.data.Temperature,
              humidity: latest.data.Humidity,
              time: latest.data.Timestamp,
              active: true,
            });
          }
        } catch {}
      }
    }).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Live Map"
        subtitle={delivery ? `Tracking: ${delivery.DelID}` : 'No active delivery'}
      />

      {!delivery ? (
        <EmptyState icon="◎" message="No active delivery to track" />
      ) : (
        <>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <LiveMap points={point ? [point] : []} height={420} />
          </Card>

          {point && (
            <div className={styles.statsGrid}>
              <StatCard label="Temperature" value={point.temp?.toFixed(1)} unit="°C" accent={point.temp > 4 || point.temp < 0 ? 'red' : 'ice'} />
              <StatCard label="Latitude" value={point.lat?.toFixed(5)} accent="ice" />
              <StatCard label="Longitude" value={point.lng?.toFixed(5)} accent="ice" />
              <StatCard label="Last Update" value={new Date(point.time).toLocaleTimeString('en-MY')} accent="green" />
            </div>
          )}

          {!point && (
            <EmptyState icon="◎" message="GPS signal not available — module may not be transmitting" />
          )}
        </>
      )}
    </div>
  );
}
