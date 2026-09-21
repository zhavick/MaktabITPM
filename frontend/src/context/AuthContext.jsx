import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { showToast, errorAlert } from '../utils/swal';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pm_token') || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('pm_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('pm_user', JSON.stringify(res.data.data));
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        localStorage.setItem('pm_token', token);
        localStorage.setItem('pm_user', JSON.stringify(user));
        showToast(`Selamat datang kembali, ${user.fullName}!`);
        return { success: true, user };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa email dan password.';
      errorAlert('Gagal Masuk', msg);
      return { success: false, message: msg };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registrasi gagal.';
      errorAlert('Gagal Mendaftar', msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    showToast('Anda telah keluar.', 'info');
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('pm_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        updateUser,
        refreshProfile,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'Admin',
        isManager: user?.role === 'Admin' || user?.role === 'ProjectManager',
        isCaretaker: user?.role === 'Admin' || user?.role === 'Caretaker',
        isConsultant: user?.employmentType === 'Consultant',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
