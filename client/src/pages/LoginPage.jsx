import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(email, password);
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.bgGlow} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.card} style={{ animation: 'fadeUp 0.5s ease both' }}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>❄</span>
          <span className={styles.logoText}>ColdWire</span>
        </div>
        <p className={styles.tagline}>Halal Cold Chain Monitoring System</p>

        <div className={styles.divider} />

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Access is restricted to registered manufacturers and drivers.
        </p>
      </div>
    </div>
  );
}
