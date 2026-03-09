import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader, StatCard, Card, EmptyState, LoadingScreen, StatusBadge
} from '../../components/ui/UI';
import LiveMap from '../../components/map/LiveMap';
import styles from '../admin/Admin.module.css';

const STAGES = [
  { key: 'awaiting_pickup', label: 'Awaiting Pickup', short: 'Awaiting' },
  { key: 'loading',         label: 'Loading',         short: 'Loading'  },
  { key: 'en_route',        label: 'En Route',        short: 'En Route' },
  { key: 'unloading',       label: 'Unloading',       short: 'Unloading'},
  { key: 'delivered',       label: 'Delivered',       short: 'Delivered'},
];

const STAGE_TO_EVENT = {
  awaiting_pickup: 'awaiting pickup',
  loading:         'loading',
  en_route:        'en route',
  unloading:       'unloading',
  delivered:       'delivered',
};

const EVENT_TO_STAGE = {
  'awaiting pickup': 'awaiting_pickup',
  'loading':         'loading',
  'en route':        'en_route',
  'unloading':       'unloading',
  'delivered':       'delivered',
};

function getStageIndex(stageKey) {
  return STAGES.findIndex(s => s.key === stageKey);
}

export default function DriverDashboard() {
  const { api, user } = useAuth();

  const [delivery, setDelivery]     = useState(null);
  const [latest, setLatest]         = useState(null);
  const [alerts, setAlerts]         = useState([]);
  const [events, setEvents]         = useState([]);
  const [point, setPoint]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const currentStageKey = (() => {
    if (!events.length) return null;
    const sorted = [...events].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    return EVENT_TO_STAGE[sorted[0].EventType] ?? null;
  })();

  const currentStageIndex = currentStageKey ? getStageIndex(currentStageKey) : -1;

  const fetchAll = useCallback(async () => {
    try {
      const delRes = await api.get('/api/deliveries');
      const allDeliveries = delRes.data || [];

      const active =
        allDeliveries.find(d => d.Status === 'In Progress') ||
        allDeliveries.find(d => d.Status === 'Not Started') ||
        null;

      setDelivery(active);

      if (!active) {
        setLoading(false);
        return;
      }

      const [sensorRes, alertRes, eventsRes] = await Promise.all([
        api.get(`/api/sensors/${active._id}/latest`).catch(() => ({ data: null })),
        api.get('/api/alerts/unresolved').catch(() => ({ data: [] })),
        api.get(`/api/events/${active._id}`).catch(() => ({ data: [] })),
      ]);

      setLatest(sensorRes.data);
      setAlerts(alertRes.data || []);
      setEvents(eventsRes.data || []);

      if (sensorRes.data?.Latitude) {
        setPoint({
          lat: sensorRes.data.Latitude,
          lng: sensorRes.data.Longitude,
          truckId: active.DelTruckID?.TruckID || active.DelID,
          temp: sensorRes.data.Temperature,
          humidity: sensorRes.data.Humidity,
          time: sensorRes.data.Timestamp,
          active: true,
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStageClick = async (stage) => {
    if (!delivery) return;
    setTransitioning(true);
    try {
      await api.post('/api/events', {
        DEvDelID: delivery._id,
        EventType: STAGE_TO_EVENT[stage.key],
        Source: 'driver',
      });
      await fetchAll();
    } catch (err) {
      console.error('Stage update failed:', err);
    } finally {
      setTransitioning(false);
    }
  };

  const handleUndo = async () => {
    if (!delivery || currentStageIndex <= 0) return;
    if (currentStageKey === 'delivered') return;
    const previousStage = STAGES[currentStageIndex - 1];
    setTransitioning(true);
    try {
      await api.post('/api/events', {
        DEvDelID: delivery._id,
        EventType: STAGE_TO_EVENT[previousStage.key],
        Source: 'driver',
      });
      await fetchAll();
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const priorityColor = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--ice)' };

  const tempWarn   = latest?.Temperature > 4 || latest?.Temperature < 0;
  const humWarn    = latest?.Humidity > 90 || latest?.Humidity < 20;
  const gasWarn    = latest?.Gas > 500;
  const highAlerts = alerts.filter(a => a.Priority === 'High').length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Driver Dashboard"
        subtitle={
          delivery
            ? `Active delivery: ${delivery.DelID} → ${delivery.DelRetID?.RetName || '—'}`
            : new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        }
      />

      {!delivery ? (
        <EmptyState icon="◈" message="No active delivery assigned to you" />
      ) : (
        <>
          <div className={styles.statsGrid} style={{ animation: 'fadeUp 0.3s ease both' }}>
            <StatCard
              label="Temperature"
              value={latest?.Temperature?.toFixed(1) ?? '—'}
              unit="°C"
              accent={tempWarn ? 'red' : 'ice'}
              icon="🌡"
            />
            <StatCard
              label="Humidity"
              value={latest?.Humidity?.toFixed(1) ?? '—'}
              unit="%"
              accent={humWarn ? 'amber' : 'green'}
              icon="💧"
            />
            <StatCard
              label="Gas"
              value={latest?.Gas?.toFixed(0) ?? '—'}
              unit="ppm"
              accent={gasWarn ? 'red' : 'ice'}
              icon="💨"
            />
            <StatCard
              label="Active Alerts"
              value={alerts.length}
              accent={highAlerts > 0 ? 'red' : alerts.length > 0 ? 'amber' : 'green'}
              icon="◬"
            />
          </div>

          <div className={styles.grid2} style={{ animation: 'fadeUp 0.4s ease both' }}>

            {/* Left: Live map + stage buttons */}
            <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                {point ? (
                  <LiveMap points={[point]} height={320} />
                ) : (
                  <div style={{
                    height: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: 'var(--white-dim)',
                    background: 'var(--navy-700)',
                  }}>
                    <span style={{ fontSize: 28, opacity: 0.3 }}>◎</span>
                    <span style={{ fontSize: 12 }}>GPS signal not available</span>
                  </div>
                )}
              </div>

              <div style={{
                padding: '14px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--navy-800)',
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--white-dim)',
                  marginBottom: 10,
                }}>
                  Delivery Progress
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGES.map((stage, i) => {
                    const isCompleted = currentStageIndex >= i;
                    const isCurrent   = currentStageIndex === i;
                    const isNext      = i === currentStageIndex + 1;
                    const isClickable = isNext && !transitioning && delivery.Status !== 'Complete';
                    const isFinal     = currentStageKey === 'delivered';
                    const canUndo     = isCurrent && currentStageKey !== 'delivered' && !transitioning;

                    let bg, borderColor, color, cursor;

                    if (isCurrent && canUndo) {
                      bg = 'var(--amber-dim)'; borderColor = 'var(--amber)'; color = 'var(--amber)'; cursor = 'pointer';
                    } else if (isCompleted) {
                      bg = 'var(--green-dim)'; borderColor = 'var(--green)'; color = 'var(--green)'; cursor = 'default';
                    } else if (isClickable) {
                      bg = 'var(--ice-dim)'; borderColor = 'var(--ice)'; color = 'var(--ice)'; cursor = 'pointer';
                    } else {
                      bg = 'var(--navy-700)'; borderColor = 'var(--border)'; color = 'var(--white-dim)'; cursor = 'not-allowed';
                    }

                    return (
                      <button
                        key={stage.key}
                        disabled={!isClickable && !canUndo}
                        onClick={() => {
                          if (canUndo) handleUndo();
                          else if (isClickable) handleStageClick(stage);
                        }}
                        title={
                          canUndo      ? `Undo: go back to ${STAGES[i - 1]?.label}` :
                          isCompleted  ? `${stage.label} ✓` :
                          isClickable  ? `Mark as: ${stage.label}` :
                          isFinal      ? 'Delivery complete' :
                          currentStageIndex === -1 && i === 0 ? 'Click to start' :
                          `Complete ${STAGES[i - 1]?.label} first`
                        }
                        style={{
                          flex: '1 1 80px',
                          padding: '8px 6px',
                          borderRadius: 8,
                          border: `1px solid ${borderColor}`,
                          background: bg,
                          color,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--font-ui)',
                          cursor,
                          transition: 'all 200ms ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          opacity: (!isClickable && !isCompleted && !canUndo) ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>
                          {canUndo ? '↩' : isCompleted ? '✓' : i === currentStageIndex + 1 ? '→' : '○'}
                        </span>
                        <span>{stage.short}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: 'var(--white-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>Status:</span>
                  <StatusBadge status={delivery.Status} />
                  {currentStageKey && (
                    <span style={{ color: 'var(--ice)', fontWeight: 600 }}>
                      · {STAGES.find(s => s.key === currentStageKey)?.label}
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Right: Alerts — read only */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Unresolved Alerts</h2>
                {highAlerts > 0 && (
                  <span className="badge badge-red">
                    <span className="dot dot-red animate-pulse" />
                    {highAlerts} High
                  </span>
                )}
              </div>

              {alerts.length === 0 ? (
                <EmptyState icon="◬" message="All clear — no active alerts" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
                  {alerts.map(a => (
                    <div
                      key={a._id}
                      className={`${styles.alertCard} ${styles[a.Priority?.toLowerCase()]}`}
                    >
                      <div className={styles.alertCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className={styles.alertCardType}
                            style={{ color: priorityColor[a.Priority] }}
                          >
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
            </Card>
          </div>
        </>
      )}
    </div>
  );
}