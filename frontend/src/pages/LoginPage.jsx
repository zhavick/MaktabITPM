import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FolderKanban, Lock, Mail, ArrowRight, UserCheck, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      if (!result.user.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const setDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Admin@123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
            marginBottom: 16
          }}>
            <FolderKanban size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Masuk ke ProjectHub</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Sistem Pelacakan Pekerjaan Internal & Konsultan
          </p>
        </div>

        {/* Demo Quick-Fill Buttons */}
        <div style={{ marginBottom: 24, padding: '14px', background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} style={{ color: 'var(--warning)' }} />
            <span>Pilih Akun Demo (Password: Admin@123):</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button type="button" onClick={() => setDemoAccount('admin@projectmgmt.local')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}>
              🛡️ Admin
            </button>
            <button type="button" onClick={() => setDemoAccount('pm@projectmgmt.local')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}>
              📊 Project Manager
            </button>
            <button type="button" onClick={() => setDemoAccount('caretaker@projectmgmt.local')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}>
              🔧 Caretaker Lead
            </button>
            <button type="button" onClick={() => setDemoAccount('employee@projectmgmt.local')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}>
              💻 Dev Internal
            </button>
            <button type="button" onClick={() => setDemoAccount('consultant@external.com')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', justifyContent: 'flex-start', gridColumn: 'span 2' }}>
              🌐 Konsultan Eksternal (Cloud Architect)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Alamat Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="nama@perusahaan.com"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                style={{ paddingLeft: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Belum memiliki akun?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Daftar Anggota Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
