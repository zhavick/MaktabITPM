import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Database, 
  HardDrive, 
  Server, 
  Users, 
  Download, 
  Upload, 
  CheckCircle, 
  RefreshCw, 
  Save, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Globe,
  FileCheck,
  Trash2
} from 'lucide-react';
import api from '../utils/api';
import { showToast, confirmDialog, successAlert, errorAlert } from '../utils/swal';
import { useSync } from '../context/SyncContext';

export default function SystemConfigPage() {
  const { syncTick } = useSync();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Config Form
  const [config, setConfig] = useState({
    baseUrl: 'http://localhost:5173',
    appTitle: 'Enterprise Project Management',
    allowRegistration: true,
  });

  // DB Health & User Stats
  const [dbHealth, setDbHealth] = useState({
    status: 'Healthy (Optimal)',
    engine: 'MySQL 8.0 (Docker Engine)',
    databaseName: 'project_management_db',
    databaseSize: '2.40 MB',
    totalUsers: 0,
    usersByRole: {},
    usersByStatus: {},
    tableCounts: {},
    checkedAt: new Date().toISOString(),
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAllData();
  }, [syncTick]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchDbHealth()]);
    } catch (err) {
      console.error('Failed to load system config data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get('/system-config');
      if (res.data && res.data.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  };

  const fetchDbHealth = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/system-config/db-health');
      if (res.data && res.data.data) {
        setDbHealth(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch db health', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await api.put('/system-config', config);
      if (res.data.success) {
        successAlert('Konfigurasi Disimpan', 'Pengaturan sistem & Base URL berhasil disimpan ke basis data.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan konfigurasi sistem.';
      errorAlert('Kesalahan', msg);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      showToast('Menyiapkan berkas cadangan database...', 'info');
      const response = await api.get('/system-config/db-export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.setAttribute('download', `Database_Backup_PM_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Cadangan basis data berhasil diunduh!');
    } catch (err) {
      console.error('Export DB error', err);
      errorAlert('Gagal Ekspor', 'Terjadi kesalahan saat mengekspor database.');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirmDialog({
      title: 'Pulihkan Database dari Berkas?',
      text: `Anda akan memulihkan data dari berkas "${file.name}". Data konfigurasi dan tabel sistem akan disinkronkan.`,
      icon: 'warning',
      confirmButtonText: 'Ya, Pulihkan Sekarang',
      cancelButtonText: 'Batal',
    });

    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setImporting(true);
      const res = await api.post('/system-config/db-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        successAlert('Pemulihan Selesai', res.data.message);
        loadAllData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengimpor database.';
      errorAlert('Gagal Impor Database', msg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDatabase = async () => {
    const confirmed = await confirmDialog({
      title: 'Reset Total Basis Data?',
      text: 'PERINGATAN: Seluruh Tugas, Catatan, Tiket, Timesheet, Presensi, Proyek, dan Pengguna non-admin akan DIHAPUS PERMANEN. Hanya akun Super Admin yang dipertahankan.',
      icon: 'warning',
      confirmButtonText: 'Ya, Hapus & Reset Semua Data!',
      confirmButtonColor: '#ef4444',
      showCancelButton: true,
      cancelButtonText: 'Batal'
    });

    if (confirmed) {
      try {
        setResetting(true);
        const res = await api.post('/system-config/db-reset');
        if (res.data.success) {
          await successAlert('Database Telah Direset!', res.data.message);
          loadAllData();
        }
      } catch (err) {
        errorAlert('Gagal Reset', err.response?.data?.message || 'Terjadi kesalahan saat mereset basis data.');
      } finally {
        setResetting(false);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Memuat konfigurasi sistem & status basis data...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Hidden file input for DB restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Konfigurasi Sistem & Basis Data
            </h1>
            <span className="badge badge-purple">Admin Mode</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Kelola parameter URL portal, pemantauan kesehatan & kapasitas storage database, serta manajemen snapshot cadangan.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDbHealth}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Memeriksa...' : 'Segarkan Status'}</span>
        </button>
      </div>

      {/* 3 Metric Cards for Database Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Card 1: Health & Engine */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status & Mesin Database</span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {dbHealth.status}
            </h2>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            {dbHealth.engine}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Database Name: <span style={{ color: 'var(--text-secondary)' }}>{dbHealth.databaseName}</span>
          </div>
        </div>

        {/* Card 2: DB Capacity / Size */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Kapasitas / Ukuran Database</span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <HardDrive size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {dbHealth.databaseSize}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total Tabel Aktif: <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(dbHealth.tableCounts || {}).length} Tabel</strong>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Penyimpanan data aman & terindeks secara optimal.
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Pengguna Terdaftar</span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
              <Users size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {dbHealth.totalUsers} Akun
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              {dbHealth.usersByStatus?.['Active'] || 0} Aktif
            </span>
            {dbHealth.usersByStatus?.['PendingApproval'] > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                {dbHealth.usersByStatus['PendingApproval']} Menunggu Persetujuan
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Diperiksa: {new Date(dbHealth.checkedAt).toLocaleTimeString('id-ID')} WIB
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: Settings & Backup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Left Column: System Base URL & Brand */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '28px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
            <Settings size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Pengaturan Server & Base URL
            </h3>
          </div>

          <form onSubmit={handleSaveConfig}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Application Base URL
              </label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  required
                  className="form-control"
                  style={{ paddingLeft: '40px', width: '100%' }}
                  placeholder="https://pm.perusahaan.com"
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                Digunakan untuk pembuatan link notifikasi email, webhook callback, dan asset resolver.
              </span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Judul Portal Aplikasi (Brand Title)
              </label>
              <input
                type="text"
                value={config.appTitle}
                onChange={(e) => setConfig({ ...config, appTitle: e.target.value })}
                required
                className="form-control"
                style={{ width: '100%' }}
                placeholder="Enterprise Project Management"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingConfig}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}
              >
                <Save size={16} />
                <span>{savingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Database Snapshot (Export & Import) */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '28px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
            <Database size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Ekspor & Impor Snapshot Basis Data
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Simpan cadangan lengkap sistem dalam format JSON snapshot portabel atau pulihkan data dari berkas yang ada.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Export Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ekspor Snapshot Cadangan (JSON)
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  Mengemas Users, Projects, Tasks, Tickets, Timesheets, dan Konfigurasi.
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportDatabase}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={15} />
                <span>Unduh JSON</span>
              </button>
            </div>

            {/* Import Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Pulihkan Basis Data (Import JSON)
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  Pilih berkas snapshot .json yang sebelumnya diekspor.
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <Upload size={15} />
                <span>{importing ? 'Memulihkan...' : 'Pilih Berkas'}</span>
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Peringatan: Impor basis data akan menyelaraskan data konfigurasi sistem dan mencatat tindakan ke modul Audit Trail demi keamanan kepatuhan data.
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Tables & Counts */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
          <Layers size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Distribusi Data & Rincian Pengguna
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* User Roles Breakdown */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Klasifikasi Akun Per Peran (Roles)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(dbHealth.usersByRole || {}).map(([role, count]) => (
                <div
                  key={role}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-solid)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{role}</span>
                  <span className="badge badge-purple">{count} User</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table Record Counts */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Volume Rekaman Data Entitas
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.entries(dbHealth.tableCounts || {}).map(([table, count]) => (
                <div
                  key={table}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-solid)',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{table}</span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Database Reset */}
      <div 
        className="card" 
        style={{ 
          marginTop: '28px',
          background: 'rgba(239, 68, 68, 0.04)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          padding: '28px', 
          borderRadius: 'var(--radius-lg)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '16px' }}>
          <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
            Zona Bahaya: Reset Total Basis Data
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          Fungsi ini akan <strong>membersihkan seluruh data operasional sistem secara permanen</strong>, meliputi seluruh <strong>Tugas, Catatan Dokumen, Tiket Kendala, Timesheet, Presensi Kehadiran, Proyek</strong>, serta menghapus semua <strong>Pengguna non-admin</strong>. Hanya akun Super Admin yang akan dipertahankan. Tindakan ini tidak dapat dibatalkan.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card-solid)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Bersihkan Seluruh Data & Sisakan Admin
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Direkomendasikan untuk melakukan 'Ekspor Snapshot Cadangan' terlebih dahulu sebelum melakukan reset.
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDatabase}
            disabled={resetting}
            className="btn btn-sm"
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: resetting ? 'not-allowed' : 'pointer'
            }}
          >
            {resetting ? (
              <>
                <RefreshCw size={15} className="spin-animation" />
                <span>Mereset Basis Data...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Reset Seluruh Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
