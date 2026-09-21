import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <Clock size={32} />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
          Menunggu Persetujuan Administrator
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          Permohonan pendaftaran akun Anda telah berhasil dicatat ke dalam sistem dengan status{' '}
          <strong style={{ color: 'var(--warning)' }}>Pending Approval</strong>.
          Project Manager atau Administrator akan meninjau keahlian serta kesesuaian proyek Anda.
        </p>

        <div style={{
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          textAlign: 'left',
          marginBottom: 28,
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
            <span>Petunjuk Demo & Pengujian:</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Untuk menguji alur persetujuan, Anda dapat masuk sebagai <strong>Admin</strong> (<code style={{ color: 'var(--primary)' }}>admin@projectmgmt.local</code> / <code style={{ color: 'var(--primary)' }}>Admin@123</code>), lalu buka menu <strong>Penerimaan Anggota</strong> untuk menyetujui akun baru Anda.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Link to="/login" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Kembali ke Halaman Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
