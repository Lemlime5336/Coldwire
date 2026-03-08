import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './ProductDetails.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Field({ label, value }) {
  return value ? (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  ) : null;
}

function SensorStat({ label, value, unit, warn }) {
  return (
    <div className={`${styles.sensorStat} ${warn ? styles.warn : ''}`}>
      <div className={styles.sensorVal}>
        {value != null ? Number(value).toFixed(1) : '—'}
        <span className={styles.sensorUnit}>{unit}</span>
      </div>
      <div className={styles.sensorLabel}>{label}</div>
    </div>
  );
}

export default function ProductDetails() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/api/products/${batchId}`)
      .then(r => setData(r.data))
      .catch(() => setError('Product not found or QR code is invalid.'))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return (
    <div className={styles.loadState}>
      <div className={styles.spinner} />
    </div>
  );

  if (error) return (
    <div className={styles.loadState}>
      <div className={styles.errorBox}>
        <span style={{ fontSize: 28 }}>◌</span>
        <p>{error}</p>
      </div>
    </div>
  );

  const { batch, delivery, supplier, manufacturer, sensorSummary, certificate } = data;

  const storageLabel = delivery?.StorageType
    ? `${delivery.StorageType} (${delivery.StorageType === 'Chilled' ? '0°C – 4°C' : 'below -18°C'})`
    : null;

  const tempWarn = delivery?.StorageType === 'Frozen'
    ? sensorSummary?.temperature > -18
    : sensorSummary?.temperature > 4 || sensorSummary?.temperature < 0;

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>❄</span>
          <span className={styles.logoText}>ColdWire</span>
        </div>
        {certificate && <span className={styles.halalBadge}>✓ Halal Verified</span>}
      </header>

      <main className={styles.main}>
        {/* Batch hero */}
        <div className={styles.hero} style={{ animation: 'fadeUp 0.4s ease both' }}>
          {batch?.ImageURL && (
            <div className={styles.heroImg}>
              <img src={batch.ImageURL} alt={batch?.Category} onError={e => e.target.style.display = 'none'} />
            </div>
          )}
          <div className={styles.heroInfo}>
            <div className={styles.productCategory}>{batch?.Category}</div>
            {batch?.Subcategory && <div className={styles.productSub}>{batch.Subcategory}</div>}
            <div className={styles.productId}>{batch?.BatchID}</div>
          </div>
        </div>

        {/* Cold chain status */}
        <div className={styles.section} style={{ animation: 'fadeUp 0.45s ease both' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>◉</span>
            <h2 className={styles.sectionTitle}>Cold Chain Monitoring</h2>
          </div>
          <div className={styles.sensorGrid}>
            <SensorStat
              label="Avg Temperature"
              value={sensorSummary?.temperature}
              unit="°C"
              warn={tempWarn}
            />
            <SensorStat
              label="Avg Humidity"
              value={sensorSummary?.humidity}
              unit="%"
            />
            <SensorStat
              label="Avg Gas"
              value={sensorSummary?.gas}
              unit="ppm"
              warn={sensorSummary?.gas > 500}
            />
          </div>
          <div className={styles.rangeNote}>
            {delivery?.StorageType === 'Frozen'
              ? 'Safe temperature range: below -18°C'
              : 'Safe temperature range: 0°C – 4°C'}
          </div>
        </div>

        {/* Batch & delivery details */}
        <div className={styles.section} style={{ animation: 'fadeUp 0.5s ease both' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>◈</span>
            <h2 className={styles.sectionTitle}>Product Details</h2>
          </div>
          <div className={styles.fieldList}>
            <Field label="Category" value={batch?.Category} />
            <Field label="Subcategory" value={batch?.Subcategory} />
            <Field label="Quantity" value={batch?.Quantity ? `${batch.Quantity} kg` : null} />
            <Field label="Storage Type" value={storageLabel} />
            <Field
              label="Date Slaughtered"
              value={batch?.DateSlaughtered ? new Date(batch.DateSlaughtered).toLocaleDateString('en-MY', { dateStyle: 'long' }) : null}
            />
            <Field
              label="Date Received"
              value={batch?.DateReceived ? new Date(batch.DateReceived).toLocaleDateString('en-MY', { dateStyle: 'long' }) : null}
            />
            <Field
              label="Delivered"
              value={delivery?.Status === 'Complete' ? '✓ Delivered' : delivery?.Status}
            />
          </div>
        </div>

        {/* Halal certificate */}
        {certificate && (
          <div className={styles.section} style={{ animation: 'fadeUp 0.55s ease both' }}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>◐</span>
              <h2 className={styles.sectionTitle}>Halal Certificate</h2>
            </div>
            <div className={styles.certCard}>
              <div className={styles.certRow}>
                <span className={styles.certKey}>Certificate ID</span>
                <span className={styles.certVal}>{certificate.CertID}</span>
              </div>
              <div className={styles.certRow}>
                <span className={styles.certKey}>Issuer</span>
                <span className={styles.certVal}>{certificate.Issuer}</span>
              </div>
              <div className={styles.certRow}>
                <span className={styles.certKey}>Issue Date</span>
                <span className={styles.certVal}>{certificate.IssueDate ? new Date(certificate.IssueDate).toLocaleDateString('en-MY') : '—'}</span>
              </div>
              <div className={styles.certRow}>
                <span className={styles.certKey}>Expiry Date</span>
                <span className={styles.certVal}>{certificate.ExpiryDate ? new Date(certificate.ExpiryDate).toLocaleDateString('en-MY') : '—'}</span>
              </div>
              {certificate.CertURL && (
                <a href={certificate.CertURL} target="_blank" rel="noreferrer" className={styles.certLink}>
                  View Certificate Document →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Supplier */}
        {supplier && (
          <div className={styles.section} style={{ animation: 'fadeUp 0.6s ease both' }}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>◰</span>
              <h2 className={styles.sectionTitle}>Supplier / Abattoir</h2>
            </div>
            <div className={styles.fieldList}>
              <Field label="Name" value={supplier.SuppName} />
              <Field label="Address" value={supplier.SuppAddress} />
              <Field label="Telephone" value={supplier.SuppTelephone} />
              <Field label="Email" value={supplier.SuppEmail} />
            </div>
          </div>
        )}

        {/* Manufacturer */}
        {manufacturer && (
          <div className={styles.section} style={{ animation: 'fadeUp 0.65s ease both' }}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>◧</span>
              <h2 className={styles.sectionTitle}>Distributor</h2>
            </div>
            <div className={styles.fieldList}>
              <Field label="Name" value={manufacturer.ManuName} />
              <Field label="Address" value={manufacturer.ManuAddress} />
              <Field label="Telephone" value={manufacturer.ManuTelephone} />
              <Field label="Email" value={manufacturer.ManuEmail} />
            </div>
          </div>
        )}

        <div className={styles.footerNote}>
          Verified by ColdWire IoT Cold Chain Monitoring System
        </div>
      </main>
    </div>
  );
}