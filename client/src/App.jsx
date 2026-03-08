import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import DriverLayout from './components/layout/DriverLayout';
// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Deliveries from './pages/admin/Deliveries';
import CreateDelivery from './pages/admin/CreateDelivery';
import SensorLogs from './pages/admin/SensorLogs';
import TrackingMap from './pages/admin/TrackingMap';
import Alerts from './pages/admin/Alerts';
import Suppliers from './pages/admin/Suppliers';
import Retailers from './pages/admin/Retailers';
import CameraFeed from './pages/admin/CameraFeed';
import Reports from './pages/admin/Reports';
import HalalCertificates from './pages/admin/HalalCertificates';
import BatchLabels from './pages/admin/BatchLabels';
// Driver pages
import DriverDashboard from './pages/driver/Dashboard';
import DriverSensorLogs from './pages/driver/SensorLogs';
import DriverAlerts from './pages/driver/Alerts';
import DriverTrackingMap from './pages/driver/TrackingMap';
import DeliveryHistory from './pages/driver/DeliveryHistory';
// Public
import ProductDetails from './pages/public/ProductDetails';
import LoginPage from './pages/LoginPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/batch/:batchId" element={<ProductDetails />} />
          {/* Role redirect */}
          <Route path="/" element={<RoleRedirect />} />
          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="deliveries/create" element={<CreateDelivery />} />
            <Route path="sensors" element={<SensorLogs />} />
            <Route path="map" element={<TrackingMap />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="retailers" element={<Retailers />} />
            <Route path="camera" element={<CameraFeed />} />
            <Route path="reports" element={<Reports />} />
            <Route path="certificates" element={<HalalCertificates />} />
            <Route path="batch-labels" element={<BatchLabels />} />
          </Route>
          {/* Driver */}
          <Route path="/driver" element={
            <ProtectedRoute role="driver"><DriverLayout /></ProtectedRoute>
          }>
            <Route index element={<DriverDashboard />} />
            <Route path="deliveries" element={<DeliveryHistory />} />
            <Route path="sensors" element={<DriverSensorLogs />} />
            <Route path="alerts" element={<DriverAlerts />} />
            <Route path="map" element={<DriverTrackingMap />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}