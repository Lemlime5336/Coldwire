import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: '⬡', end: true },
  { to: '/admin/deliveries', label: 'Deliveries', icon: '◈' },
  { to: '/admin/sensors', label: 'Sensor Logs', icon: '◉' },
  { to: '/admin/map', label: 'Live Map', icon: '◎' },
  { to: '/admin/alerts', label: 'Alerts', icon: '◬' },
  { to: '/admin/camera', label: 'Camera Feed', icon: '◫' },
  { to: '/admin/reports', label: 'Reports', icon: '◧' },
  { to: '/admin/suppliers', label: 'Suppliers', icon: '◰' },
  { to: '/admin/retailers', label: 'Retailers', icon: '◱' },
  { to: '/admin/certificates', label: 'Certificates', icon: '◐' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>❄</span>
          <span className={styles.brandName}>ColdWire</span>
        </div>
        <div className={styles.roleChip}>
          <span className={styles.roleDot} />
          Admin Console
        </div>
        <nav className={styles.nav}>
          {nav.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{user?.role?.[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userRole}>Administrator</div>
              <div className={styles.userId} title={user?.id}>ID: {user?.id?.slice(-6)}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            ⏻
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}