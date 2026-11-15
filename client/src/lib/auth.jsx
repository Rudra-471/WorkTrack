import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (getToken()) {
      api('/auth/me')
        .then((d) => setUser(d.user))
        .catch(() => setToken(null))
        .finally(() => setReady(true));
    }
    const onLogout = () => setUser(null);
    window.addEventListener('worktrack:logout', onLogout);
    return () => window.removeEventListener('worktrack:logout', onLogout);
  }, []);

  const startSession = (d) => {
    setToken(d.token);
    setUser(d.user);
  };

  const login = async (email, password) => {
    startSession(await api('/auth/login', { method: 'POST', body: { email, password } }));
  };

  // First sign-in: create a password for an account that doesn't have one yet.
  const setupAccount = async (email, name, password) => {
    startSession(await api('/auth/setup', { method: 'POST', body: { email, name, password } }));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, setupAccount, logout, isSupervisor: user?.role === 'SUPERVISOR' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
