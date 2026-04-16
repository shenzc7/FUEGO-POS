import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('fuego_authenticated') === 'true';
  });

  const login = (username, password) => {
    // Safest approach: Use Environment Variables with a fallback during transition
    const validUsername = import.meta.env.VITE_AUTH_USERNAME || 'admin';
    const validPassword = import.meta.env.VITE_AUTH_PASSWORD || 'fuego2024';

    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('fuego_authenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('fuego_authenticated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
