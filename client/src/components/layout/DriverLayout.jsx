import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';
import {
  LayoutDashboard, Truck, Activity,
  MapPin, AlertTriangle, LogOut
} from 'lucide-react';

const nav = [
  { to: '/driver',            label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/driver/deliveries', label: 'My Deliveries', icon: Truck },
  { to: '/driver/sensors',    label: 'Sensor Logs',   icon: Activity },
  { to: '/driver/map',        label: 'Live Map',       icon: MapPin },
  { to: '/driver/alerts',     label: 'Alerts',         icon: AlertTriangle },
];

export default function DriverLayout() {
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
        <div className={styles.roleChip} style={{ background: 'var(--green-dim)', borderColor: 'rgba(34,201,122,0.2)', color: 'var(--green)' }}>
          <span className={styles.roleDot} style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          Driver Portal
        </div>
        <nav className={styles.nav}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={16} className={styles.navIcon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar} style={{ color: 'var(--green)' }}>D</div>
            <div>
              <div className={styles.userRole}>Driver</div>
              <div className={styles.userId}>ID: {user?.id?.slice(-6)}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}