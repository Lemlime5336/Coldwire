import styles from './UI.module.css';

export function Card({ children, className = '', style }) {
  return (
    <div className={`${styles.card} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, unit, icon, accent = 'ice', trend }) {
  return (
    <div className={`${styles.statCard} ${styles[`accent-${accent}`]}`}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        {icon && <span className={styles.statIcon}>{icon}</span>}
      </div>
      <div className={styles.statValue}>
        <span className={styles.statNum}>{value ?? '—'}</span>
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className={`${styles.statTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.pageAction}>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = '◌', message = 'No data available' }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <span className={styles.emptyMsg}>{message}</span>
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <Spinner size={32} />
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[`btn-${variant}`]} ${styles[`btn-${size}`]}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.inputLabel}>{label}</label>}
      <input className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.inputErrorMsg}>{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, ...props }) {
  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.inputLabel}>{label}</label>}
      <select className={`${styles.input} ${styles.select} ${error ? styles.inputError : ''}`} {...props}>
        {children}
      </select>
      {error && <span className={styles.inputErrorMsg}>{error}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export function Table({ headers, children, emptyMessage = 'No records found' }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map(h => <th key={h} className={styles.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, mono }) {
  return (
    <td className={`${styles.td} ${mono ? styles.mono : ''}`}>{children}</td>
  );
}

export function StatusBadge({ status }) {
  const map = {
    'Not Started': 'badge-steel',
    'In Progress': 'badge-amber',
    'Complete': 'badge-green',
    'active': 'badge-green',
    'inactive': 'badge-steel',
    'Low': 'badge-ice',
    'Medium': 'badge-amber',
    'High': 'badge-red',
  };
  const dotMap = {
    'Not Started': 'dot-ice',
    'In Progress': 'dot-amber animate-pulse',
    'Complete': 'dot-green',
    'Low': 'dot-ice',
    'Medium': 'dot-amber',
    'High': 'dot-red animate-pulse',
  };
  return (
    <span className={`badge ${map[status] || 'badge-steel'}`}>
      {dotMap[status] && <span className={`dot ${dotMap[status]}`} />}
      {status}
    </span>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map(t => (
        <button
          key={t.value}
          className={`${styles.tab} ${active === t.value ? styles.tabActive : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
