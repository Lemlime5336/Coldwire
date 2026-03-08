import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatCard, Card, Tabs, EmptyState, LoadingScreen } from '../../components/ui/UI';
import SensorChart from '../../components/charts/SensorChart';
import styles from './Admin.module.css';

export default function SensorLogs() {
  const { api } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [metric, setMetric] = useState('temperature');

  useEffect(() => {
    api.get('/api/deliveries').then(r => {
      const active = (r.data || []).filter(d => d.Status !== 'Complete');
      setDeliveries(active);
      if (active.length > 0) setSelected(active[0]._id);
    }).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    setLogsLoading(true);
    api.get(`/api/sensors/${selected}`)
      .then(r => setLogs(r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [selected, api]);

  if (loading) return <LoadingScreen />;

  const latest = logs[logs.length - 1];
  const avg = (key) => logs.length ? (logs.reduce((s, l) => s + (l[key] || 0), 0) / logs.length).toFixed(1) : null;

  const deliveryTabs = deliveries.map(d => ({ label: d.DelID, value: d._id }));
  const metricTabs = [
    { label: 'Temperature', value: 'temperature' },
    { label: 'Humidity', value: 'humidity' },
    { label: 'Gas (ppm)', value: 'gas' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Sensor Logs" subtitle="Live environmental monitoring per delivery" />

      {deliveries.length === 0 ? (
        <EmptyState icon="◉" message="No active deliveries to monitor" />
      ) : (
        <>
          <div className={styles.sensorTabs}>
            <Tabs tabs={deliveryTabs} active={selected} onChange={setSelected} />
          </div>

          <div className={styles.statsGrid} style={{ marginBottom: 20 }}>
            <StatCard
              label="Temperature"
              value={latest?.Temperature?.toFixed(1) ?? avg('Temperature')}
              unit="°C"
              accent={latest?.Temperature > 4 || latest?.Temperature < 0 ? 'red' : 'ice'}
            />
            <StatCard
              label="Humidity"
              value={latest?.Humidity?.toFixed(1) ?? avg('Humidity')}
              unit="%"
              accent={latest?.Humidity > 90 || latest?.Humidity < 20 ? 'amber' : 'green'}
            />
            <StatCard
              label="Gas"
              value={latest?.Gas?.toFixed(0) ?? avg('Gas')}
              unit="ppm"
              accent={latest?.Gas > 500 ? 'red' : 'ice'}
            />
            <StatCard label="Readings" value={logs.length} accent="ice" />
          </div>

          <Card>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Sensor History</h2>
              <Tabs tabs={metricTabs} active={metric} onChange={setMetric} />
            </div>
            {logsLoading ? (
              <EmptyState message="Loading…" />
            ) : logs.length === 0 ? (
              <EmptyState icon="◌" message="No sensor data for this delivery" />
            ) : (
              <SensorChart data={logs} metric={metric} height={260} />
            )}
          </Card>

          {logs.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Raw Readings</h2>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--white-dim)' }}>
                  Last 20 entries
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Timestamp', 'Temp °C', 'Humidity %', 'Gas ppm', 'GPS'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--white-dim)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...logs].reverse().slice(0, 20).map(l => (
                      <tr key={l._id}>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--white-dim)', borderBottom: '1px solid rgba(91,196,232,0.05)' }}>
                          {new Date(l.Timestamp).toLocaleString('en-MY')}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 12, color: l.Temperature > 4 || l.Temperature < 0 ? 'var(--red)' : 'var(--white)', borderBottom: '1px solid rgba(91,196,232,0.05)' }}>
                          {l.Temperature?.toFixed(1)}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--white)', borderBottom: '1px solid rgba(91,196,232,0.05)' }}>
                          {l.Humidity?.toFixed(1)}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 12, color: l.Gas > 500 ? 'var(--red)' : 'var(--white)', borderBottom: '1px solid rgba(91,196,232,0.05)' }}>
                          {l.Gas?.toFixed(0)}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--white-dim)', borderBottom: '1px solid rgba(91,196,232,0.05)' }}>
                          {l.Latitude?.toFixed(4)}, {l.Longitude?.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
