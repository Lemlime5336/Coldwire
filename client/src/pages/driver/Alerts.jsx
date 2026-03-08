import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, LoadingScreen, StatusBadge } from '../../components/ui/UI';
import styles from '../admin/Admin.module.css';

export default function DriverAlerts() {
  const { api } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get unresolved alerts — server filters by manu, driver sees their delivery's alerts
    api.get('/api/alerts/unresolved').then(r => setAlerts(r.data || [])).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  const priorityColor = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--ice)' };

  return (
    <div className={styles.page}>
      <PageHeader title="Alerts" subtitle={`${alerts.length} active alert${alerts.length !== 1 ? 's' : ''} on your delivery`} />

      {alerts.length === 0 ? (
        <EmptyState icon="◬" message="All clear — no active alerts on your truck" />
      ) : (
        <div>
          {alerts.map(a => (
            <div key={a._id} className={`${styles.alertCard} ${styles[a.Priority?.toLowerCase()]}`}>
              <div className={styles.alertCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={styles.alertCardType} style={{ color: priorityColor[a.Priority] }}>
                    {a.AlertType}
                  </span>
                  <StatusBadge status={a.Priority} />
                </div>
              </div>
              <p className={styles.alertCardMsg}>{a.AlertMessage}</p>
              <div className={styles.alertCardMeta}>
                <span>{new Date(a.CreatedAt).toLocaleString('en-MY')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
