import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Shield, Sparkles, Wifi, WifiOff, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export default function Navbar() {
  const { user, theme, toggleTheme } = useAuth();
  const { isConnected, connectionState } = useSync();

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Real-time Multi-user Background Sync Indicator */}
        <div
          title={
            isConnected
              ? 'Multi-user Automatic Background Sync Aktif (SignalR)'
              : `Status Sinkronisasi: ${connectionState}`
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: isConnected ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.725rem',
            fontWeight: 700,
            color: isConnected ? 'var(--success)' : 'var(--warning)',
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#f59e0b',
              boxShadow: isConnected ? '0 0 8px #10b981' : 'none',
            }}
          />
          <span>{isConnected ? 'Sync Live' : connectionState}</span>
        </div>

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
          gap: 6,
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)'
        }}>
          <Shield size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {user?.role}
          </span>
        </div>

        {/* User Profile Quick Link */}
        <Link
          to="/profile"
          title="Buka Pengaturan Profil Saya"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 4px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '0.75rem',
            }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.fullName?.charAt(0) || 'U'
            )}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName?.split(' ')[0] || 'Profil'}
          </span>
        </Link>
      </div>
    </header>
  );
}
