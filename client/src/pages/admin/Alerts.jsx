import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Button, Select, EmptyState, LoadingScreen, StatusBadge } from '../../components/ui/UI';
import styles from './Admin.module.css';

export default function Alerts() {
  const { api } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');
  const [resolving, setResolving] = useState(null);

  const fetchAlerts = () => {
    const url = filter === 'unresolved' ? '/api/alerts/unresolved' : '/api/alerts';
    api.get(url).then(r => setAlerts(r.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filter, api]);

  const resolve = async (id) => {
    setResolving(id);
    try {
      await api.patch(`/api/alerts/${id}/resolve`);
      setAlerts(a => a.filter(x => x._id !== id));
    } catch {}
    setResolving(null);
  };

  if (loading) return <LoadingScreen />;

  const priorityColor = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--ice)' };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alerts"
        subtitle={`${alerts.length} ${filter} alert${alerts.length !== 1 ? 's' : ''}`}
      />

      <div className={styles.filterBar}>
        <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="unresolved">Unresolved</option>
          <option value="all">All Alerts</option>
        </Select>
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon="◬" message={filter === 'unresolved' ? 'All clear — no active alerts' : 'No alerts found'} />
      ) : (
        <div>
          {alerts.map(a => (
            <div
              key={a._id}
              className={`${styles.alertCard} ${styles[a.Priority?.toLowerCase()]}`}
            >
              <div className={styles.alertCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className={styles.alertCardType}
                    style={{ color: priorityColor[a.Priority] }}
                  >
                    {a.AlertType}
                  </span>
                  <StatusBadge status={a.Priority} />
                </div>
                {!a.Resolved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolve(a._id)}
                    disabled={resolving === a._id}
                  >
                    {resolving === a._id ? '…' : 'Resolve'}
                  </Button>
                )}
                {a.Resolved && (
                  <span className="badge badge-green">Resolved</span>
                )}
              </div>

              <p className={styles.alertCardMsg}>{a.AlertMessage}</p>

              <div className={styles.alertCardMeta}>
                <span>DELIVERY: {a.ADelID?.DelID || a.ADelID}</span>
                <span>MODULE: {a.AIMID?.IMID || a.AIMID}</span>
                <span>{new Date(a.CreatedAt).toLocaleString('en-MY')}</span>
                {a.LastUpdate !== a.CreatedAt && (
                  <span>Updated: {new Date(a.LastUpdate).toLocaleString('en-MY')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
