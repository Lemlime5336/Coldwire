import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Table, Td, StatusBadge, EmptyState, LoadingScreen } from '../../components/ui/UI';
import styles from '../../pages/admin/Admin.module.css';

export default function DeliveryHistory() {
  const { api } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/deliveries').then(r => setDeliveries(r.data || [])).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  const current = deliveries.find(d => d.Status === 'In Progress');

  return (
    <div className={styles.page}>
      <PageHeader title="My Deliveries" subtitle="Your delivery history and current assignment" />

      {current && (
        <div style={{
          background: 'var(--ice-dim)',
          border: '1px solid rgba(91,196,232,0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          animation: 'fadeUp 0.3s ease both',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ice)', marginBottom: 4 }}>
              Active Delivery
            </div>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 600, color: 'var(--white)' }}>
              {current.DelID}
            </div>
            <div style={{ fontSize: 13, color: 'var(--white-dim)', marginTop: 2 }}>
              → {current.DelRetID?.RetName || 'Unknown destination'}
            </div>
          </div>
          <StatusBadge status={current.Status} />
        </div>
      )}

      {deliveries.length === 0 ? (
        <EmptyState icon="◈" message="No deliveries assigned yet" />
      ) : (
        <Table headers={['Delivery ID', 'Truck', 'Destination', 'Batches', 'Status', 'Date']}>
          {[...deliveries].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)).map(d => (
            <tr key={d._id}>
              <Td mono>{d.DelID}</Td>
              <Td mono>{d.DelTruckID?.TruckID || '—'}</Td>
              <Td>{d.DelRetID?.RetName || '—'}</Td>
              <Td mono>{d.DelBatchID?.length ?? 0}</Td>
              <Td><StatusBadge status={d.Status} /></Td>
              <Td mono>{new Date(d.CreatedAt).toLocaleDateString('en-MY')}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
