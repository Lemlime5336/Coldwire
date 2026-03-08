import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatCard, Card, EmptyState, LoadingScreen } from '../../components/ui/UI';
import SensorChart from '../../components/charts/SensorChart';
import styles from '../admin/Admin.module.css';

export default function DriverSensorLogs() {
  const { api } = useAuth();
  const [delivery, setDelivery] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('temperature');

  useEffect(() => {
    api.get('/api/deliveries').then(async r => {
      const active = (r.data || []).find(d => d.Status === 'In Progress');
      setDelivery(active || null);
      if (active) {
        const sRes = await api.get(`/api/sensors/${active._id}`);
        setLogs(sRes.data || []);
      }
    }).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  const latest = logs[logs.length - 1];

  const METRICS = ['temperature', 'humidity', 'gas'];

  return (
    <div className={styles.page}>
      <PageHeader title="Sensor Logs" subtitle={delivery ? `Active: ${delivery.DelID}` : 'No active delivery'} />

      {!delivery ? (
        <EmptyState icon="◉" message="No active delivery — sensor data unavailable" />
      ) : (
        <>
          <div className={styles.statsGrid} style={{ marginBottom: 20 }}>
            <StatCard
              label="Temperature"
              value={latest?.Temperature?.toFixed(1)}
              unit="°C"
              accent={latest?.Temperature > 4 || latest?.Temperature < 0 ? 'red' : 'ice'}
            />
            <StatCard
              label="Humidity"
              value={latest?.Humidity?.toFixed(1)}
              unit="%"
              accent="green"
            />
            <StatCard
              label="Gas"
              value={latest?.Gas?.toFixed(0)}
              unit="ppm"
              accent={latest?.Gas > 500 ? 'red' : 'ice'}
            />
            <StatCard label="Readings" value={logs.length} accent="ice" />
          </div>

          <Card>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Sensor History</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {METRICS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    style={{
                      padding: '5px 10px', borderRadius: 6, border: '1px solid',
                      borderColor: metric === m ? 'var(--ice)' : 'var(--border)',
                      background: metric === m ? 'var(--ice-dim)' : 'transparent',
                      color: metric === m ? 'var(--ice)' : 'var(--white-dim)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'var(--font-ui)'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {logs.length === 0 ? (
              <EmptyState message="No sensor data yet" />
            ) : (
              <SensorChart data={logs} metric={metric} height={240} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
