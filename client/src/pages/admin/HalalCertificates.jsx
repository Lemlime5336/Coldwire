import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader, Button, Input, Select, Table, Td, Modal, EmptyState, LoadingScreen
} from '../../components/ui/UI';
import styles from './Admin.module.css';

function ExpiryBadge({ date }) {
  if (!date) return <span className="badge badge-steel">No expiry</span>;
  const expiry = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)
    return <span className="badge badge-red"><span className="dot dot-red animate-pulse" />Expired</span>;
  if (daysLeft <= 30)
    return <span className="badge badge-amber"><span className="dot dot-amber animate-pulse" />Expires in {daysLeft}d</span>;
  return <span className="badge badge-green"><span className="dot dot-green" />Valid</span>;
}

const emptyForm = {
  CertSuppID: '',
  Issuer: '',
  IssueDate: '',
  ExpiryDate: '',
};

export default function HalalCertificates() {
  const { api } = useAuth();

  const [certs, setCerts]           = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [file, setFile]             = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [filterSupp, setFilterSupp]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const fileInputRef = useRef(null);

  // Fetch certs — optionally filtered by suppId server-side
  const fetchCerts = (suppId = 'all') => {
    const url = suppId !== 'all'
      ? `/api/certificates?suppId=${suppId}`
      : '/api/certificates';
    api.get(url)
      .then(r => setCerts(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCerts();
    api.get('/api/suppliers')
      .then(r => setSuppliers((r.data || []).filter(s => s.IsActive)))
      .catch(() => {});
  }, [api]);

  const getStatus = (date) => {
    if (!date) return 'valid';
    const daysLeft = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiring';
    return 'valid';
  };

  // Status filter is still client-side (no extra request needed)
  const filtered = certs.filter(c => {
    const status = getStatus(c.ExpiryDate);
    return filterStatus === 'all' || filterStatus === status;
  });

  const openModal = () => {
    setForm(emptyForm);
    setFile(null);
    setError('');
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setFile(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Only JPEG, PNG, and PDF files are allowed.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }
    setError('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.CertSuppID) return setError('Please select a supplier.');
    if (!file) return setError('Please upload a certificate file.');
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('certificate', file);
      fd.append('CertSuppID', form.CertSuppID);
      fd.append('Issuer', form.Issuer);
      if (form.IssueDate)  fd.append('IssueDate', form.IssueDate);
      if (form.ExpiryDate) fd.append('ExpiryDate', form.ExpiryDate);

      await api.post('/api/certificates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      closeModal();
      fetchCerts(filterSupp); // re-fetch respecting current supplier filter
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const expiredCount  = certs.filter(c => getStatus(c.ExpiryDate) === 'expired').length;
  const expiringCount = certs.filter(c => getStatus(c.ExpiryDate) === 'expiring').length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Halal Certificates"
        subtitle={`${certs.length} certificate${certs.length !== 1 ? 's' : ''}${expiredCount > 0 ? ` · ${expiredCount} expired` : ''}${expiringCount > 0 ? ` · ${expiringCount} expiring soon` : ''}`}
        action={<Button onClick={openModal}>+ Upload Certificate</Button>}
      />

      {(expiredCount > 0 || expiringCount > 0) && (
        <div style={{
          background: expiredCount > 0 ? 'var(--red-dim)' : 'var(--amber-dim)',
          border: `1px solid ${expiredCount > 0 ? 'var(--red)' : 'var(--amber)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 16px',
          fontSize: 13,
          color: expiredCount > 0 ? 'var(--red)' : 'var(--amber)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeUp 0.3s ease both',
        }}>
          <span style={{ fontSize: 16 }}>◬</span>
          {expiredCount > 0
            ? `${expiredCount} certificate${expiredCount > 1 ? 's have' : ' has'} expired and may need renewal.`
            : `${expiringCount} certificate${expiringCount > 1 ? 's are' : ' is'} expiring within 30 days.`}
        </div>
      )}

      <div className={styles.filterBar}>
        <Select
          value={filterSupp}
          onChange={e => {
            setFilterSupp(e.target.value);
            fetchCerts(e.target.value);
          }}
          style={{ width: 200 }}
        >
          <option value="all">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s._id} value={s._id}>{s.SuppName}</option>
          ))}
        </Select>

        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All Statuses</option>
          <option value="valid">Valid</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </Select>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--white-dim)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="◐" message="No certificates match your filters" />
      ) : (
        <Table headers={['Cert ID', 'Supplier', 'Issuer', 'Issue Date', 'Expiry Date', 'Status', 'Document']}>
          {filtered.map(c => (
            <tr key={c._id}>
              <Td mono>{c.CertID}</Td>
              <Td>{c.CertSuppID?.SuppName || '—'}</Td>
              <Td>{c.Issuer || '—'}</Td>
              <Td mono>{c.IssueDate ? new Date(c.IssueDate).toLocaleDateString('en-MY') : '—'}</Td>
              <Td mono>{c.ExpiryDate ? new Date(c.ExpiryDate).toLocaleDateString('en-MY') : '—'}</Td>
              <Td><ExpiryBadge date={c.ExpiryDate} /></Td>
              <Td>
                {c.CertURL ? (
                  <a
                    href={c.CertURL}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ice)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    View →
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--white-dim)' }}>No file</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={closeModal} title="Upload Halal Certificate">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Supplier"
            value={form.CertSuppID}
            onChange={e => setForm(f => ({ ...f, CertSuppID: e.target.value }))}
            required
          >
            <option value="">Select supplier...</option>
            {suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.SuppName}</option>
            ))}
          </Select>

          <Input
            label="Issuer (e.g. JAKIM)"
            value={form.Issuer}
            onChange={e => setForm(f => ({ ...f, Issuer: e.target.value }))}
            placeholder="JAKIM"
            required
          />

          <div className={styles.formGrid}>
            <Input
              label="Issue Date"
              type="date"
              value={form.IssueDate}
              onChange={e => setForm(f => ({ ...f, IssueDate: e.target.value }))}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={form.ExpiryDate}
              onChange={e => setForm(f => ({ ...f, ExpiryDate: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--white-dim)',
            }}>
              Certificate File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${file ? 'var(--green)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '16px 20px',
                cursor: 'pointer',
                background: file ? 'var(--green-dim)' : 'var(--navy-700)',
                transition: 'all var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20, opacity: 0.6 }}>{file ? '◈' : '◌'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: file ? 'var(--green)' : 'var(--white)' }}>
                  {file ? file.name : 'Click to select file'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 2 }}>
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · ${file.type}`
                    : 'JPEG, PNG, or PDF · max 10MB'}
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'var(--white-dim)',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--red-dim)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload Certificate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}