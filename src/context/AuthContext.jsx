import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Safely read + validate the persisted user from localStorage.
// Any corruption (old format, bad JSON) returns null and cleans up.
const readPersistedUser = () => {
  try {
    const raw = localStorage.getItem('fuego_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Must be an object with a valid role — reject legacy "true" string sessions
    if (parsed && typeof parsed === 'object' && (parsed.role === 'admin' || parsed.role === 'owner')) {
      return parsed;
    }
    // Stale / corrupt — wipe both old and new keys
    localStorage.removeItem('fuego_user');
    localStorage.removeItem('fuego_authenticated');
    return null;
  } catch {
    // JSON.parse failed — wipe and recover
    localStorage.removeItem('fuego_user');
    localStorage.removeItem('fuego_authenticated');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readPersistedUser);

  const isAuthenticated = !!user;

  const login = (username, password) => {
    if (!username || !password) return false;

    // Admin credentials (from env vars with safe fallbacks)
    const adminUser = import.meta.env.VITE_AUTH_USERNAME || 'admin';
    const adminPass = import.meta.env.VITE_AUTH_PASSWORD || 'fuego2024';

    // Owner credentials
    const ownerUser = 'owner';
    const ownerPass = 'owner2713';

    if (username === adminUser && password === adminPass) {
      const userData = { username: adminUser, role: 'admin' };
      setUser(userData);
      localStorage.setItem('fuego_user', JSON.stringify(userData));
      return true;
    }

    if (username === ownerUser && password === ownerPass) {
      const userData = { username: ownerUser, role: 'owner' };
      setUser(userData);
      localStorage.setItem('fuego_user', JSON.stringify(userData));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fuego_user');
    localStorage.removeItem('fuego_authenticated'); // clean up legacy key too
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
