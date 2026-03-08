import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Button, Input, Table, Td, Modal, EmptyState, LoadingScreen } from '../../components/ui/UI';
import styles from './Admin.module.css';

export default function Retailers() {
  const { api } = useAuth();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ RetName: '', RetAddress: '', RetTelephone: '', RetEmail: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetch = () => api.get('/api/retailers').then(r => setRetailers(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, [api]);

  const toggle = async (id) => { await api.patch(`/api/retailers/${id}/toggle`); fetch(); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/retailers', form);
      setModal(false);
      setForm({ RetName: '', RetAddress: '', RetTelephone: '', RetEmail: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create retailer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Retailers"
        subtitle="Registered delivery destinations"
        action={<Button onClick={() => setModal(true)}>+ Register Retailer</Button>}
      />
      {retailers.length === 0 ? (
        <EmptyState icon="◱" message="No retailers registered yet" />
      ) : (
        <Table headers={['ID', 'Name', 'Email', 'Telephone', 'Address', 'Status', '']}>
          {retailers.map(r => (
            <tr key={r._id}>
              <Td mono>{r.RetID}</Td>
              <Td>{r.RetName}</Td>
              <Td>{r.RetEmail}</Td>
              <Td mono>{r.RetTelephone}</Td>
              <Td>{r.RetAddress}</Td>
              <Td>
                <span className={`badge ${r.IsActive ? 'badge-green' : 'badge-steel'}`}>
                  <span className="dot" style={{ background: r.IsActive ? 'var(--green)' : 'var(--white-dim)' }} />
                  {r.IsActive ? 'Active' : 'Inactive'}
                </span>
              </Td>
              <Td>
                <Button size="sm" variant="ghost" onClick={() => toggle(r._id)}>
                  {r.IsActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Retailer">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Retailer Name" value={form.RetName} onChange={e => setForm(f => ({ ...f, RetName: e.target.value }))} required />
          <Input label="Email" type="email" value={form.RetEmail} onChange={e => setForm(f => ({ ...f, RetEmail: e.target.value }))} required />
          <Input label="Telephone" value={form.RetTelephone} onChange={e => setForm(f => ({ ...f, RetTelephone: e.target.value }))} />
          <Input label="Address" value={form.RetAddress} onChange={e => setForm(f => ({ ...f, RetAddress: e.target.value }))} />
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