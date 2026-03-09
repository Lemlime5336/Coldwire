import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Button, Input, Select, Card } from '../../components/ui/UI';
import styles from './Admin.module.css';

const CATEGORIES = {
  Beef: ['Ribeye', 'Sirloin', 'Brisket', 'Chuck', 'Tenderloin', 'Ground Beef', 'Other'],
  Chicken: ['Whole', 'Breast', 'Thigh', 'Drumstick', 'Wings', 'Ground Chicken', 'Other'],
};

const CATEGORY_NAMES = [...Object.keys(CATEGORIES), 'Custom...'];

const emptyBatch = () => ({
  BCertID: '',
  Category: '',
  Subcategory: '',
  DateSlaughtered: '',
  DateReceived: '',
  Quantity: '',
  RFIDTag: '',
});

export default function CreateDelivery() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [trucks, setTrucks]       = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [modules, setModules]     = useState([]);
  const [certs, setCerts]         = useState([]);
  const [rfidTags, setRfidTags]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [form, setForm] = useState({
    DelTruckID: '',
    DelUserID: '',
    DelRetID: '',
    DelIMID: '',
    StorageType: '',
  });

  const [batches, setBatches] = useState([emptyBatch()]);
  const [batchSupplier, setBatchSupplier] = useState({});
  const [customCategory, setCustomCategory] = useState({});
  const [customSubcategory, setCustomSubcategory] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDeliveryId, setCreatedDeliveryId] = useState(null);
  const [createdDeliveryLabel, setCreatedDeliveryLabel] = useState('');

  useEffect(() => {
    api.get('/api/trucks')
      .then(r => setTrucks((r.data || []).filter(x => x.IsActive)))
      .catch(() => {});

    api.get('/api/users?available=true')
    .then(r => setDrivers((r.data || []).filter(x => x.Role === 'driver' && x.IsActive)))
    .catch(() => {});

    api.get('/api/retailers')
      .then(r => setRetailers((r.data || []).filter(x => x.IsActive)))
      .catch(() => {});

    api.get('/api/iot-modules')
      .then(r => setModules((r.data || []).filter(x => x.IsActive)))
      .catch(() => {});

    api.get('/api/certificates')
      .then(r => setCerts(r.data || []))
      .catch(() => setCerts([]));

    api.get('/api/rfid-tags?available=true')
      .then(r => setRfidTags((r.data || []).filter(x => x.IsActive)))
      .catch(() => setRfidTags([]));

    api.get('/api/suppliers')
      .then(r => setSuppliers((r.data || []).filter(x => x.IsActive)))
      .catch(() => {});
  }, [api]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setBatchField = (i, k, v) =>
    setBatches(bs => bs.map((b, idx) => idx === i ? { ...b, [k]: v } : b));

  const addBatch = () => setBatches(bs => [...bs, emptyBatch()]);
  const removeBatch = (i) => setBatches(bs => bs.filter((_, idx) => idx !== i));

  const handleSupplierChange = (i, suppId) => {
    setBatchSupplier(s => ({ ...s, [i]: suppId }));
    setBatchField(i, 'BCertID', '');
  };

  const handleCategoryChange = (i, value) => {
    if (value === 'Custom...') {
      setCustomCategory(c => ({ ...c, [i]: true }));
      setBatchField(i, 'Category', '');
    } else {
      setCustomCategory(c => ({ ...c, [i]: false }));
      setCustomSubcategory(c => ({ ...c, [i]: false }));
      setBatchField(i, 'Category', value);
      setBatchField(i, 'Subcategory', '');
    }
  };

  const handleSubcategoryChange = (i, value) => {
    if (value === 'Other') {
      setCustomSubcategory(c => ({ ...c, [i]: true }));
      setBatchField(i, 'Subcategory', '');
    } else {
      setCustomSubcategory(c => ({ ...c, [i]: false }));
      setBatchField(i, 'Subcategory', value);
    }
  };

  const getAvailableTagsForBatch = (currentIndex) => {
    const selectedInOtherBatches = batches
      .filter((_, idx) => idx !== currentIndex)
      .map(b => b.RFIDTag)
      .filter(Boolean);
    return rfidTags.filter(t => !selectedInOtherBatches.includes(t.UID));
  };

  const getCertsForBatch = (i) => {
    const suppId = batchSupplier[i];
    if (!suppId) return certs;
    return certs.filter(c =>
      c.CertSuppID?._id === suppId || c.CertSuppID === suppId
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const delRes = await api.post('/api/deliveries', form);
      const deliveryId = delRes.data._id;
      const deliveryLabel = delRes.data.DelID || deliveryId;

      for (const batch of batches) {
        if (batch.Category) {
          await api.post('/api/batches', {
            BDelID: deliveryId,
            ...batch,
            BCertID: batch.BCertID || undefined,
            RFIDTag: batch.RFIDTag || undefined,
            Quantity: Number(batch.Quantity),
          });
        }
      }

      setCreatedDeliveryId(deliveryId);
      setCreatedDeliveryLabel(deliveryLabel);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create delivery');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (createdDeliveryId) {
    return (
      <div className={styles.page}>
        <div style={{
          maxWidth: 480,
          margin: '80px auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            Delivery Created
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>{createdDeliveryLabel}</strong> and its batches have been saved.
            Would you like to generate QR labels for the batches now?
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to={`/admin/batch-labels?delivery=${createdDeliveryId}`}
              style={{ textDecoration: 'none' }}
            >
              <Button>Generate QR Labels →</Button>
            </Link>
            <Button variant="ghost" onClick={() => navigate('/admin/deliveries')}>
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <PageHeader
        title="New Delivery"
        subtitle="Create a delivery and assign batches"
        action={<Button variant="ghost" onClick={() => navigate('/admin/deliveries')}>Back</Button>}
      />

      <form onSubmit={handleSubmit}>
        <Card style={{ marginBottom: 16 }}>
          <div className={styles.formSectionTitle}>Delivery Details</div>
          <div className={styles.formGrid}>
            <Select label="Truck" value={form.DelTruckID} onChange={e => setField('DelTruckID', e.target.value)} required>
              <option value="">Select truck...</option>
              {trucks.map(t => <option key={t._id} value={t._id}>{t.TruckID}</option>)}
            </Select>

            <Select label="Driver" value={form.DelUserID} onChange={e => setField('DelUserID', e.target.value)} required>
              <option value="">Select driver...</option>
              {drivers.map(d => <option key={d._id} value={d._id}>{d.UserName} ({d.UserID})</option>)}
            </Select>

            <Select label="Retailer (Destination)" value={form.DelRetID} onChange={e => setField('DelRetID', e.target.value)} required>
              <option value="">Select retailer...</option>
              {retailers.map(r => <option key={r._id} value={r._id}>{r.RetName}</option>)}
            </Select>

            <Select label="IoT Module" value={form.DelIMID} onChange={e => setField('DelIMID', e.target.value)} required>
              <option value="">Select module...</option>
              {modules.map(m => <option key={m._id} value={m._id}>{m.IMID}</option>)}
            </Select>

            <Select label="Storage Type" value={form.StorageType} onChange={e => setField('StorageType', e.target.value)} required>
              <option value="">Select storage type...</option>
              <option value="Chilled">Chilled (0°C – 4°C)</option>
              <option value="Frozen">Frozen (below -18°C)</option>
            </Select>
          </div>
        </Card>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800 }}>Batches</span>
            <Button type="button" variant="secondary" size="sm" onClick={addBatch}>+ Add Batch</Button>
          </div>

          {batches.map((batch, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className={styles.formSectionTitle} style={{ marginBottom: 0 }}>Batch {i + 1}</span>
                {batches.length > 1 && (
                  <Button type="button" variant="danger" size="sm" onClick={() => removeBatch(i)}>Remove</Button>
                )}
              </div>
              <div className={styles.formGrid}>

                <Select
                  label="Supplier (filters certificates)"
                  value={batchSupplier[i] || ''}
                  onChange={e => handleSupplierChange(i, e.target.value)}
                >
                  <option value="">All suppliers</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.SuppName}</option>
                  ))}
                </Select>

                <Select
                  label="Halal Certificate"
                  value={batch.BCertID}
                  onChange={e => setBatchField(i, 'BCertID', e.target.value)}
                >
                  <option value="">None / select later</option>
                  {getCertsForBatch(i).map(c => (
                    <option key={c._id} value={c._id}>
                      {c.CertID} - expires {new Date(c.ExpiryDate).toLocaleDateString()}
                    </option>
                  ))}
                </Select>

                <div>
                  <Select
                    label="Category"
                    value={customCategory[i] ? 'Custom...' : (batch.Category || '')}
                    onChange={e => handleCategoryChange(i, e.target.value)}
                    required
                  >
                    <option value="">Select category...</option>
                    {CATEGORY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  {customCategory[i] && (
                    <input
                      className={styles.customInput}
                      placeholder="Type category..."
                      value={batch.Category}
                      onChange={e => setBatchField(i, 'Category', e.target.value)}
                      required
                    />
                  )}
                </div>

                <div>
                  {!customCategory[i] && batch.Category && CATEGORIES[batch.Category] ? (
                    <>
                      <Select
                        label="Subcategory"
                        value={customSubcategory[i] ? 'Other' : (batch.Subcategory || '')}
                        onChange={e => handleSubcategoryChange(i, e.target.value)}
                      >
                        <option value="">Select subcategory...</option>
                        {CATEGORIES[batch.Category].map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                      {customSubcategory[i] && (
                        <input
                          className={styles.customInput}
                          placeholder="Type subcategory..."
                          value={batch.Subcategory}
                          onChange={e => setBatchField(i, 'Subcategory', e.target.value)}
                        />
                      )}
                    </>
                  ) : (
                    <Input
                      label="Subcategory"
                      placeholder="e.g. Ribeye"
                      value={batch.Subcategory}
                      onChange={e => setBatchField(i, 'Subcategory', e.target.value)}
                    />
                  )}
                </div>

                <Input
                  label="Quantity"
                  type="number"
                  placeholder="0"
                  value={batch.Quantity}
                  onChange={e => setBatchField(i, 'Quantity', e.target.value)}
                  required
                />

                <Input
                  label="Date Slaughtered"
                  type="date"
                  value={batch.DateSlaughtered}
                  onChange={e => setBatchField(i, 'DateSlaughtered', e.target.value)}
                />

                <Input
                  label="Date Received"
                  type="date"
                  value={batch.DateReceived}
                  onChange={e => setBatchField(i, 'DateReceived', e.target.value)}
                />

                <Select
                  label="RFID Tag"
                  value={batch.RFIDTag}
                  onChange={e => setBatchField(i, 'RFIDTag', e.target.value)}
                >
                  <option value="">None / assign later</option>
                  {getAvailableTagsForBatch(i).map(t => (
                    <option key={t._id} value={t.UID}>{t.UID} ({t.TagID})</option>
                  ))}
                </Select>

              </div>
            </Card>
          ))}
        </div>

        {error && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className={styles.formActions}>
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/deliveries')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Delivery'}
          </Button>
        </div>
      </form>
    </div>
  );
}