import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Button, Input, Table, Td, Modal, EmptyState, LoadingScreen } from '../../components/ui/UI';
import styles from './Admin.module.css';

export default function Suppliers() {
  const { api } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ SuppName: '', SuppAddress: '', SuppTelephone: '', SuppEmail: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetch = () => api.get('/api/suppliers').then(r => setSuppliers(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, [api]);

  const toggle = async (id) => {
    await api.patch(`/api/suppliers/${id}/toggle`);
    fetch();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/suppliers', form);
      setModal(false);
      setForm({ SuppName: '', SuppAddress: '', SuppTelephone: '', SuppEmail: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Suppliers"
        subtitle="Registered halal abattoirs and suppliers"
        action={<Button onClick={() => setModal(true)}>+ Register Supplier</Button>}
      />
      {suppliers.length === 0 ? (
        <EmptyState icon="◰" message="No suppliers registered yet" />
      ) : (
        <Table headers={['ID', 'Name', 'Email', 'Telephone', 'Address', 'Status', '']}>
          {suppliers.map(s => (
            <tr key={s._id}>
              <Td mono>{s.SuppID}</Td>
              <Td>{s.SuppName}</Td>
              <Td>{s.SuppEmail}</Td>
              <Td mono>{s.SuppTelephone}</Td>
              <Td>{s.SuppAddress}</Td>
              <Td>
                <span className={`badge ${s.IsActive ? 'badge-green' : 'badge-steel'}`}>
                  <span className={`dot ${s.IsActive ? 'dot-green' : ''}`} style={{ background: s.IsActive ? undefined : 'var(--white-dim)' }} />
                  {s.IsActive ? 'Active' : 'Inactive'}
                </span>
              </Td>
              <Td>
                <Button size="sm" variant="ghost" onClick={() => toggle(s._id)}>
                  {s.IsActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Supplier">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Supplier Name" value={form.SuppName} onChange={e => setForm(f => ({ ...f, SuppName: e.target.value }))} required />
          <Input label="Email" type="email" value={form.SuppEmail} onChange={e => setForm(f => ({ ...f, SuppEmail: e.target.value }))} required />
          <Input label="Telephone" value={form.SuppTelephone} onChange={e => setForm(f => ({ ...f, SuppTelephone: e.target.value }))} />
          <Input label="Address" value={form.SuppAddress} onChange={e => setForm(f => ({ ...f, SuppAddress: e.target.value }))} />
          {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Register'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}