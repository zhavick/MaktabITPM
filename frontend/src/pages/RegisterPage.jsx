import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FolderKanban, User, Mail, Lock, Building, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { successAlert } from '../utils/swal';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    employmentType: 'Internal', // Internal, Consultant
    companyOrAgency: '',
    hourlyRate: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await register(formData);
    setSubmitting(false);

    if (result.success) {
      await successAlert(
        'Pendaftaran Berhasil Terkirim!',
        'Akun Anda telah dicatat dan saat ini berstatus Pending Approval. Administrator akan meninjau permohonan Anda sebelum akun diaktifkan.'
      );
      navigate('/pending-approval');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <FolderKanban size={24} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Penerimaan Anggota Baru</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Daftarkan diri Anda sebagai anggota tim internal atau konsultan proyek
          </p>
        </div>

        {/* Type Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: 6,
          background: 'var(--bg-card-solid)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            className="btn"
            onClick={() => setFormData({ ...formData, employmentType: 'Internal' })}
            style={{
              background: formData.employmentType === 'Internal' ? 'var(--primary)' : 'transparent',
              color: formData.employmentType === 'Internal' ? '#fff' : 'var(--text-secondary)',
              boxShadow: formData.employmentType === 'Internal' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              padding: '8px 12px',
              fontSize: '0.85rem'
            }}
          >
            🏢 Karyawan Internal
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setFormData({ ...formData, employmentType: 'Consultant' })}
            style={{
              background: formData.employmentType === 'Consultant' ? 'var(--primary)' : 'transparent',
              color: formData.employmentType === 'Consultant' ? '#fff' : 'var(--text-secondary)',
              boxShadow: formData.employmentType === 'Consultant' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              padding: '8px 12px',
              fontSize: '0.85rem'
            }}
          >
            🌐 Konsultan Eksternal
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Michael Santoso"
                style={{ paddingLeft: 40 }}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="nama@domain.com"
                style={{ paddingLeft: 40 }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.employmentType === 'Consultant' && (
            <>
              <div className="form-group">
                <label className="form-label">Nama Perusahaan / Agensi Konsultan</label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: PT Mitra Solusi Digital"
                    style={{ paddingLeft: 40 }}
                    value={formData.companyOrAgency}
                    onChange={(e) => setFormData({ ...formData, companyOrAgency: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tarif Jam Kerja (Billing Hourly Rate - IDR)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Contoh: 250000"
                    style={{ paddingLeft: 40 }}
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="Minimal 6 karakter"
                style={{ paddingLeft: 40 }}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: 10,
            alignItems: 'center'
          }}>
            <CheckCircle2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span>
              Pendaftaran Anda akan diverifikasi oleh Admin/Project Manager sebelum akun dapat login dan mengakses modul proyek.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? 'Memproses Pendaftaran...' : 'Ajukan Permohonan Akun'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Sudah memiliki akun?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Masuk Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
