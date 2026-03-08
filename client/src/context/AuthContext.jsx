import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cw_token'));
  const [loading, setLoading] = useState(true);

  // Attach token to all requests
  useEffect(() => {
    const interceptor = API.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => API.interceptors.request.eject(interceptor);
  }, [token]);

  // Decode JWT payload (no verify — server handles that)
  const decodeToken = (t) => {
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser({ id: payload.id, role: payload.role, manuId: payload.manuId });
      } else {
        // Expired
        localStorage.removeItem('cw_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await API.post('/api/auth/login', { UserEmail: email, Password: password });
    const { token: newToken } = res.data;
    localStorage.setItem('cw_token', newToken);
    setToken(newToken);
    const payload = decodeToken(newToken);
    setUser({ id: payload.id, role: payload.role, manuId: payload.manuId });
    return payload.role;
  }, []);

  const logout = useCallback(async () => {
    try { await API.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('cw_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, api: API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { API };
