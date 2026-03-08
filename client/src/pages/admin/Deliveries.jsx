import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader, Button, Table, Td, StatusBadge, EmptyState, LoadingScreen, Input, Select
} from '../../components/ui/UI';
import styles from './Admin.module.css';

function StorageBadge({ type }) {
  if (!type) return <span className="badge badge-steel">—</span>;
  return (
    <span className={`badge ${type === 'Frozen' ? 'badge-ice' : 'badge-green'}`}>
      <span className={`dot ${type === 'Frozen' ? 'dot-ice' : 'dot-green'}`} />
      {type}
    </span>
  );
}

export default function Deliveries() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storageFilter, setStorageFilter] = useState('all');

  useEffect(() => {
    api.get('/api/deliveries').then(r => setDeliveries(r.data || [])).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingScreen />;

  const filtered = deliveries.filter(d => {
    const matchSearch = d.DelID?.toLowerCase().includes(search.toLowerCase()) ||
      d.DelRetID?.RetName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter  === 'all' || d.Status      === statusFilter;
    const matchStorage = storageFilter === 'all' || d.StorageType === storageFilter;
    return matchSearch && matchStatus && matchStorage;
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Deliveries"
        subtitle={`${deliveries.length} total deliveries`}
        action={<Button onClick={() => navigate('/admin/deliveries/create')}>+ New Delivery</Button>}
      />

      <div className={styles.filterBar}>
        <Input
          placeholder="Search by ID or retailer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Complete">Complete</option>
        </Select>
        <Select value={storageFilter} onChange={e => setStorageFilter(e.target.value)} style={{ width: 150 }}>
          <option value="all">All Storage</option>
          <option value="Chilled">Chilled</option>
          <option value="Frozen">Frozen</option>
        </Select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--white-dim)' }}>
          {filtered.length} results
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="◈" message="No deliveries match your filters" />
      ) : (
        <Table headers={['Delivery ID', 'Truck', 'Driver', 'Retailer', 'Storage', 'Batches', 'Status', 'Created']}>
          {filtered.map(d => (
            <tr key={d._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/batch-labels?delivery=${d._id}`)}>
              <Td mono>{d.DelID}</Td>
              <Td mono>{d.DelTruckID?.TruckID || '—'}</Td>
              <Td>{d.DelUserID?.UserName || '—'}</Td>
              <Td>{d.DelRetID?.RetName || '—'}</Td>
              <Td><StorageBadge type={d.StorageType} /></Td>
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