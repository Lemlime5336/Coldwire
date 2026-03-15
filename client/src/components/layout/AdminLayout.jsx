import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';
import {
  LayoutDashboard, Truck, Activity, MapPin,
  AlertTriangle, Camera, FileText, Building2,
  Store, ShieldCheck, LogOut
} from 'lucide-react';

const nav = [
  { to: '/admin',              label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/admin/deliveries',   label: 'Deliveries',   icon: Truck },
  { to: '/admin/sensors',      label: 'Sensor Logs',  icon: Activity },
  { to: '/admin/map',          label: 'Live Map',     icon: MapPin },
  { to: '/admin/alerts',       label: 'Alerts',       icon: AlertTriangle },
  { to: '/admin/camera',       label: 'Camera Feed',  icon: Camera },
  { to: '/admin/reports',      label: 'Reports',      icon: FileText },
  { to: '/admin/suppliers',    label: 'Suppliers',    icon: Building2 },
  { to: '/admin/retailers',    label: 'Retailers',    icon: Store },
  { to: '/admin/certificates', label: 'Certificates', icon: ShieldCheck },
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
            <div className={styles.userAvatar}>{user?.role?.[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userRole}>Administrator</div>
              <div className={styles.userId} title={user?.id}>ID: {user?.id?.slice(-6)}</div>
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