import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          setAuthToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Default to Aarav (Lost owner demo user) for immediate, smooth experience
      switchDemoUser('aarav').finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const switchDemoUser = async (demoKey) => {
    const credentials = {
      aarav: { email: 'aarav@campus.edu', password: 'password123' },
      rahul: { email: 'rahul@campus.edu', password: 'password123' },
      admin: { email: 'admin@campus.edu', password: 'admin123' },
    };

    const cred = credentials[demoKey];
    if (!cred) return;

    try {
      const data = await api.login(cred);
      setAuthToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Failed to switch demo account', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
