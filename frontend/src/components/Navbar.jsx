import React from 'react';
import { Sun, Moon, Bell, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, theme, toggleTheme } = useAuth();

  return (
    <header style={{
      height: 64,
      background: 'var(--bg-card)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--primary)'
        }}>
          <Sparkles size={14} />
          <span>Enterprise Portal</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>•</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {user?.companyOrAgency ? `${user.companyOrAgency} (${user.employmentType})` : 'Internal Corporate Team'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          title={`Ubah ke ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          style={{ width: 36, height: 36, padding: 0, borderRadius: '50%' }}
        >
          {theme === 'dark' ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
        </button>

        {/* User Role Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)'
        }}>
          <Shield size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}
