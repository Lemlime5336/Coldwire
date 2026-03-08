import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Select, StatCard, Card, EmptyState, LoadingScreen, StatusBadge } from '../../components/ui/UI';
import SensorChart from '../../components/charts/SensorChart';
import styles from './Admin.module.css';

export default function Reports() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected] = useState(searchParams.get('delivery') || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [metric, setMetric] = useState('temperature');

  useEffect(() => {
    api.get('/api/deliveries').then(r => {
      setDeliveries(r.data || []);
      if (!selected && r.data?.length) setSelected(r.data[0]._id);
    }).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!selected) return;
    setReportLoading(true);
    api.get(`/api/reports/delivery/${selected}`)
      .then(r => setReport(r.data))
      .catch(() => setReport(null))
      .finally(() => setReportLoading(false));
  }, [selected, api]);

  if (loading) return <LoadingScreen />;

  const EVENT_LABELS = {
    'awaiting pickup': 'Awaiting Pickup',
    'loading':         'Loading',
    'en route':        'En Route',
    'unloading':       'Unloading',
    'delivered':       'Delivered',
  };

  // Derive temp accent based on StorageType
  const isFrozen   = report?.delivery?.StorageType === 'Frozen';
  const maxTemp    = report?.sensorSummary?.temperature?.max;
  const tempBreach = isFrozen ? maxTemp > -18 : maxTemp > 4;

  return (
    <div className={styles.page}>
      <PageHeader title="Delivery Reports" subtitle="Full sensor, event, and alert breakdown per delivery" />

      <div className={styles.filterBar} style={{ marginBottom: 20 }}>
        <Select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ width: 220 }}
        >
          <option value="">Select delivery...</option>
          {deliveries.map(d => (
            <option key={d._id} value={d._id}>{d.DelID} — {d.DelRetID?.RetName || '?'}</option>
          ))}
        </Select>
      </div>

      {!selected && <EmptyState icon="◧" message="Select a delivery to view its report" />}
      {selected && reportLoading && <LoadingScreen />}
      {selected && !reportLoading && !report && (
        <EmptyState icon="◌" message="No report data found for this delivery" />
      )}

      {report && (
        <>
          {/* Header summary */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 18, fontWeight: 600, color: 'var(--ice)', marginBottom: 4 }}>
                  {report.delivery?.DelID}
                </div>
                <div style={{ fontSize: 13, color: 'var(--white-dim)' }}>
                  {report.delivery?.DelRetID?.RetName || 'Unknown retailer'} · Driver: {report.delivery?.DelUserID?.UserName || '—'}
                  {report.delivery?.StorageType && (
                    <span style={{ marginLeft: 8, color: isFrozen ? 'var(--ice)' : 'var(--green)', fontWeight: 600 }}>
                      · {report.delivery.StorageType}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={report.delivery?.Status} />
            </div>
          </Card>

          {/* Sensor stats — fixed field names */}
          <div className={styles.statsGrid} style={{ marginBottom: 16 }}>
            <StatCard
              label="Avg Temperature"
              value={report.sensorSummary?.temperature?.avg?.toFixed(1)}
              unit="°C"
              accent="ice"
            />
            <StatCard
              label="Max Temperature"
              value={report.sensorSummary?.temperature?.max?.toFixed(1)}
              unit="°C"
              accent={tempBreach ? 'red' : 'green'}
            />
            <StatCard
              label="Avg Humidity"
              value={report.sensorSummary?.humidity?.avg?.toFixed(1)}
              unit="%"
              accent="green"
            />
            <StatCard
              label="Total Alerts"
              value={report.alerts?.total ?? 0}
              accent={report.alerts?.total > 0 ? 'amber' : 'green'}
            />
          </div>

          {/* Chart */}
          {report.sensorLogs?.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Sensor History</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['temperature', 'humidity', 'gas'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: metric === m ? 'var(--ice)' : 'var(--border)',
                        background: metric === m ? 'var(--ice-dim)' : 'transparent',
                        color: metric === m ? 'var(--ice)' : 'var(--white-dim)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <SensorChart data={report.sensorLogs} metric={metric} height={220} />
            </Card>
          )}

          <div className={styles.grid2}>
            {/* Event Timeline */}
            <Card>
              <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>Event Timeline</h2>
              {report.events?.length === 0 ? (
                <EmptyState message="No events recorded" />
              ) : (
                <div className={styles.timeline}>
                  {report.events?.map(ev => (
                    <div key={ev._id} className={styles.timelineItem}>
                      <div className={styles.timelineType}>{EVENT_LABELS[ev.EventType] || ev.EventType}</div>
                      <div className={styles.timelineTime}>{new Date(ev.CreatedAt).toLocaleString('en-MY')}</div>
                      <div className={styles.timelineMeta}>Source: {ev.Source}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Alerts breakdown — fixed structure */}
            <Card>
              <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>Alert Breakdown</h2>
              {(report.alerts?.total ?? 0) === 0 ? (
                <EmptyState icon="◬" message="No alerts for this delivery" />
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--white-dim)' }}>
                      Total: <strong style={{ color: 'var(--white)' }}>{report.alerts.total}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--white-dim)' }}>
                      Unresolved: <strong style={{ color: report.alerts.unresolved > 0 ? 'var(--amber)' : 'var(--white)' }}>{report.alerts.unresolved}</strong>
                    </span>
                  </div>
                  {Object.entries(report.alerts.byType || {}).map(([type, count]) => (
                    <div key={type} style={{ padding: '10px 0', borderBottom: '1px solid rgba(91,196,232,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: type === 'temperature' || type === 'gas' || type === 'batch mismatch' ? 'var(--red)' : 'var(--amber)' }}>
                        {type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--white-dim)' }}>{count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Batches */}
          {report.batches?.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 16 }}>Batches</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {report.batches.map(b => (
                  <div key={b._id} style={{ background: 'var(--navy-700)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: 'var(--ice)', marginBottom: 6 }}>{b.BatchID}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{b.Category}{b.Subcategory && ` — ${b.Subcategory}`}</div>
                    <div style={{ fontSize: 12, color: 'var(--white-dim)' }}>{b.Quantity} kg</div>
                    {b.BCertID && (
                      <div style={{ fontSize: 11, color: 'var(--ice)', marginTop: 4, fontFamily: 'var(--font-data)' }}>
                        Cert: {b.BCertID.CertID || b.BCertID}
                      </div>
                    )}
                    {b.DateSlaughtered && (
                      <div style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 4, fontFamily: 'var(--font-data)' }}>
                        Slaughtered: {new Date(b.DateSlaughtered).toLocaleDateString('en-MY')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}