import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader, Button, Card, Select, EmptyState, LoadingScreen,
} from '../../components/ui/UI';
import styles from './Admin.module.css';

// print helpers

function printBatch(batch) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>QR — ${batch.BatchID}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
  img { width: 280px; height: 280px; display: block; }
  p { margin-top: 10px; font-family: monospace; font-size: 13px; color: #0f172a; letter-spacing: 0.05em; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <img src="${batch.QRCodeURL}" alt="QR ${batch.BatchID}" />
  <p>${batch.BatchID}</p>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

function printAllBatches(batches) {
  const sections = batches
    .filter(b => b.QRCodeURL)
    .map(batch => `
      <div class="qr-page">
        <img src="${batch.QRCodeURL}" alt="QR ${batch.BatchID}" />
        <p>${batch.BatchID}</p>
      </div>`).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>QR Sheet — All Batches</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; }
  .qr-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; page-break-after: always; }
  .qr-page:last-child { page-break-after: avoid; }
  img { width: 280px; height: 280px; display: block; }
  p { margin-top: 10px; font-family: monospace; font-size: 13px; color: #0f172a; letter-spacing: 0.05em; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
${sections || '<p style="text-align:center;padding:40px;color:#94a3b8">No QR codes to print.</p>'}
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── component ──────────────────────────────────────────────────────────────────

export default function Products() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();

  const [deliveries, setDeliveries]             = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [batches, setBatches]                   = useState([]);
  const [generating, setGenerating]             = useState({}); // { [batch._id]: bool }
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [loadingBatches, setLoadingBatches]     = useState(false);

  // Load deliveries on mount
  useEffect(() => {
    api.get('/api/deliveries')
      .then(res => {
        const all = res.data || [];
        setDeliveries(all);
        const preselect = searchParams.get('delivery');
        if (preselect) {
          const found = all.find(d => d._id === preselect || d.DelID === preselect);
          if (found) setSelectedDelivery(found);
        }
      })
      .finally(() => setLoadingDeliveries(false));
  }, []);

  // Load batches when delivery changes
  useEffect(() => {
    if (!selectedDelivery) { setBatches([]); return; }
    setLoadingBatches(true);
    setBatches([]);
    api.get(`/api/batches/${selectedDelivery._id}`)
      .then(res => setBatches(res.data || []))
      .finally(() => setLoadingBatches(false));
  }, [selectedDelivery?._id]);

  const handleGenerate = async batch => {
    setGenerating(prev => ({ ...prev, [batch._id]: true }));
    try {
      const res = await api.post(`/api/batches/${batch._id}/qr`);
      setBatches(prev => prev.map(b => b._id === batch._id ? { ...b, QRCodeURL: res.data.QRCodeURL } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate QR.');
    } finally {
      setGenerating(prev => ({ ...prev, [batch._id]: false }));
    }
  };

  const deliveryLabel = selectedDelivery
    ? `Delivery ${selectedDelivery.DelID} · ${selectedDelivery.DelRetID?.RetName || 'Unknown Retailer'}`
    : '';

  const allGenerated = batches.length > 0 && batches.every(b => b.QRCodeURL);

  if (loadingDeliveries) return <LoadingScreen />;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <PageHeader
        title="Products & QR Codes"
        subtitle="Generate and print QR labels per batch for consumer traceability"
        action={allGenerated && (
          <Button onClick={() => printAllBatches(batches)}>
            Print All Batches
          </Button>
        )}
      />

      {/* ── Delivery selector ── */}
      <div className={styles.filterBar}>
        <Select
          value={selectedDelivery?._id || ''}
          onChange={e => {
            const d = deliveries.find(x => x._id === e.target.value);
            setSelectedDelivery(d || null);
          }}
          style={{ width: 360 }}
        >
          <option value="">— select a delivery —</option>
          {deliveries.map(d => (
            <option key={d._id} value={d._id}>
              {d.DelID} · {d.Status} · {d.DelRetID?.RetName || 'Unknown Retailer'}
            </option>
          ))}
        </Select>
      </div>

      {/* ── No delivery selected ── */}
      {!selectedDelivery && (
        <EmptyState icon="◻" message="Select a delivery above to manage its QR codes" />
      )}

      {/* ── Loading batches ── */}
      {selectedDelivery && loadingBatches && <LoadingScreen />}

      {/* ── Delivery summary strip ── */}
      {selectedDelivery && !loadingBatches && (
        <Card style={{ padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['Delivery', selectedDelivery.DelID],
              ['Retailer', selectedDelivery.DelRetID?.RetName || '—'],
              ['Truck',    selectedDelivery.DelTruckID?.TruckID || '—'],
              ['Storage',  selectedDelivery.StorageType],
              ['Batches',  batches.length],
            ].map(([label, val]) => (
              <div key={label}>
                <div className={styles.formSectionTitle} style={{ marginBottom: 4, paddingBottom: 0, borderBottom: 'none' }}>
                  {label}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--white)' }}>{val}</div>
              </div>
            ))}
            <div>
              <div className={styles.formSectionTitle} style={{ marginBottom: 4, paddingBottom: 0, borderBottom: 'none' }}>
                Status
              </div>
              <span className={
                selectedDelivery.Status === 'Complete'    ? 'badge badge-green' :
                selectedDelivery.Status === 'In Progress' ? 'badge badge-amber' :
                'badge badge-steel'
              }>
                {selectedDelivery.Status}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── No batches ── */}
      {selectedDelivery && !loadingBatches && batches.length === 0 && (
        <EmptyState icon="◈" message="No batches found for this delivery" />
      )}

      {/* ── Per-batch cards ── */}
      {!loadingBatches && batches.map(batch => {
        const isGenerated  = !!batch.QRCodeURL;
        const isGenerating = !!generating[batch._id];

        return (
          <Card key={batch._id} style={{ marginBottom: 16 }}>

            {/* Batch header */}
            <div className={styles.cardHeader}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={styles.cardTitle}>{batch.BatchID}</span>
                  <span className={isGenerated ? 'badge badge-green' : 'badge badge-steel'}>
                    {isGenerated ? 'QR Ready' : 'No QR'}
                  </span>
                  
                </div>
                <div style={{ fontSize: 13, color: 'var(--white-dim)' }}>
                  {batch.Category}{batch.Subcategory ? ` / ${batch.Subcategory}` : ''}
                  {' · '}Qty {batch.Quantity}
                  {batch.DateSlaughtered && (
                    <> · Slaughtered {new Date(batch.DateSlaughtered).toLocaleDateString('en-MY')}</>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button
                  variant={isGenerated ? 'ghost' : 'primary'}
                  onClick={() => handleGenerate(batch)}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating…' : isGenerated ? '↺ Regenerate' : 'Generate QR'}
                </Button>
                {isGenerated && (
                  <Button variant="secondary" onClick={() => printBatch(batch)}>
                    Print
                  </Button>
                )}
              </div>
            </div>

            {/* QR display */}
            {isGenerating && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--white-dim)', fontSize: 13 }}>
                Generating QR and uploading to Cloudinary…
              </div>
            )}

            {!isGenerating && !isGenerated && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--white-dim)', fontSize: 13 }}>
                Click <strong>Generate QR</strong> to create a scannable label for this batch.
              </div>
            )}

            {!isGenerating && isGenerated && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  background: 'var(--navy-800)',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <img
                    src={batch.QRCodeURL}
                    alt={`QR for ${batch.BatchID}`}
                    style={{ width: 160, height: 160, borderRadius: 4 }}
                  />
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-data)', fontWeight: 700, color: 'var(--white)' }}>
                    {batch.BatchID}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}