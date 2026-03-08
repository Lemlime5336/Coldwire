import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, LoadingScreen, Button } from '../../components/ui/UI';
import styles from './Admin.module.css';

export default function Dashboard() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/deliveries'),
      api.get('/api/alerts/unresolved'),
    ]).then(([dRes, aRes]) => {
      setDeliveries(dRes.data || []);
      setAlerts(aRes.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  const inProgress = deliveries.filter(d => d.Status === 'In Progress').length;
  const complete = deliveries.filter(d => d.Status === 'Complete').length;
  const notStarted = deliveries.filter(d => d.Status === 'Not Started').length;
  const highAlerts = alerts.filter(a => a.Priority === 'High').length;

  const recent = [...deliveries].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)).slice(0, 5);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Operations Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        action={
          <Button onClick={() => navigate('/admin/deliveries/create')}>
            + New Delivery
          </Button>
        }
      />

      <div className={styles.statsGrid} style={{ animation: 'fadeUp 0.3s ease both' }}>
        <StatCard label="In Transit" value={inProgress} accent="amber" icon="◉" />
        <StatCard label="Completed" value={complete} accent="green" icon="◈" />
        <StatCard label="Not Started" value={notStarted} accent="ice" icon="◌" />
        <StatCard label="Active Alerts" value={alerts.length} accent={highAlerts > 0 ? 'red' : 'amber'} icon="◬" />
      </div>

      <div className={styles.grid2} style={{ animation: 'fadeUp 0.4s ease both' }}>
        <Card>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent Deliveries</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/deliveries')}>
              View all →
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState message="No deliveries yet" />
          ) : (
            <div className={styles.recentList}>
              {recent.map(d => (
                <div key={d._id} className={styles.recentRow}>
                  <div>
                    <span className={styles.deliveryId}>{d.DelID}</span>
                    <span className={styles.deliveryMeta}>
                      → {d.DelRetID?.RetName || 'Unknown retailer'}
                    </span>
                  </div>
                  <StatusBadge status={d.Status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Unresolved Alerts</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/alerts')}>
              View all →
            </Button>
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon="◉" message="All clear — no active alerts" />
          ) : (
            <div className={styles.recentList}>
              {alerts.slice(0, 5).map(a => (
                <div key={a._id} className={styles.recentRow}>
                  <div>
                    <span className={styles.alertType}>{a.AlertType}</span>
                    <span className={styles.deliveryMeta}>{a.AlertMessage?.slice(0, 48)}…</span>
                  </div>
                  <StatusBadge status={a.Priority} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ animation: 'fadeUp 0.5s ease both' }}>
        <Card>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Delivery Status Breakdown</h2>
          </div>
          <div className={styles.breakdownBars}>
            {[
              { label: 'Not Started', count: notStarted, total: deliveries.length, color: 'var(--ice)' },
              { label: 'In Progress', count: inProgress, total: deliveries.length, color: 'var(--amber)' },
              { label: 'Complete', count: complete, total: deliveries.length, color: 'var(--green)' },
            ].map(({ label, count, total, color }) => (
              <div key={label} className={styles.barRow}>
                <span className={styles.barLabel}>{label}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: total ? `${(count / total) * 100}%` : '0%', background: color }}
                  />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
