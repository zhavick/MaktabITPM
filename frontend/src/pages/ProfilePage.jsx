import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  Key, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Save, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { showToast, successAlert, errorAlert } from '../utils/swal';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'security'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    employmentType: '',
    companyOrAgency: '',
    hourlyRate: 0,
    phoneNumber: '',
    bio: '',
    location: '',
    avatarUrl: '',
    coverUrl: '',
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      if (res.data && res.data.data) {
        const d = res.data.data;
        setProfile({
          fullName: d.fullName || '',
          email: d.email || '',
          role: d.role || '',
          employmentType: d.employmentType || '',
          companyOrAgency: d.companyOrAgency || '',
          hourlyRate: d.hourlyRate || 0,
          phoneNumber: d.phoneNumber || '',
          bio: d.bio || '',
          location: d.location || '',
          avatarUrl: d.avatarUrl || '',
          coverUrl: d.coverUrl || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      showToast('Gagal memuat profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/profile', {
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        bio: profile.bio,
        location: profile.location,
        companyOrAgency: profile.companyOrAgency,
        hourlyRate: parseFloat(profile.hourlyRate) || 0,
      });

      if (res.data.success) {
        successAlert('Profil Tersimpan', 'Informasi profil Anda berhasil diperbarui.');
        updateUser({
          ...user,
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          bio: profile.bio,
          location: profile.location,
          companyOrAgency: profile.companyOrAgency,
          hourlyRate: profile.hourlyRate,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan profil.';
      errorAlert('Kesalahan', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorAlert('Format Tidak Didukung', 'Silakan unggah berkas gambar (.png, .jpg, .webp).');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingAvatar(true);
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        showToast('Foto profil berhasil diperbarui!');
        setProfile((prev) => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        updateUser({ ...user, avatarUrl: res.data.avatarUrl });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengunggah foto profil.';
      errorAlert('Gagal Upload Avatar', msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorAlert('Format Tidak Didukung', 'Silakan unggah berkas gambar (.png, .jpg, .webp).');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingCover(true);
      const res = await api.post('/profile/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        showToast('Foto sampul berhasil diperbarui!');
        setProfile((prev) => ({ ...prev, coverUrl: res.data.coverUrl }));
        updateUser({ ...user, coverUrl: res.data.coverUrl });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengunggah foto sampul.';
      errorAlert('Gagal Upload Cover', msg);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      errorAlert('Formulir Tidak Lengkap', 'Harap isi password saat ini dan password baru.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      errorAlert('Password Terlalu Pendek', 'Password baru minimal harus 6 karakter.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errorAlert('Konfirmasi Berbeda', 'Konfirmasi password baru tidak cocok.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/profile/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      if (res.data.success) {
        successAlert('Password Diperbarui', res.data.message);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengganti password.';
      errorAlert('Gagal Mengganti Password', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Memuat profil pengguna...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hidden file inputs for avatar and cover */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Header Banner & Avatar Card */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Cover Photo / Banner */}
        <div
          style={{
            height: '220px',
            width: '100%',
            position: 'relative',
            backgroundColor: '#1e1b4b',
            backgroundImage: profile.coverUrl
              ? `url(${profile.coverUrl})`
              : 'linear-gradient(135deg, #4338ca 0%, #312e81 40%, #0f172a 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            padding: '16px',
          }}
        >
          {/* Subtle overlay for gradient aesthetic */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Upload Cover Button */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="btn btn-secondary btn-sm"
            style={{
              position: 'relative',
              zIndex: 2,
              backdropFilter: 'blur(8px)',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
            }}
          >
            <ImageIcon size={15} />
            <span>{uploadingCover ? 'Mengunggah...' : 'Ubah Foto Sampul'}</span>
          </button>
        </div>

        {/* Profile Identity Bar */}
        <div
          style={{
            padding: '0 32px 28px',
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          {/* Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginTop: '-60px' }}>
            {/* Avatar container */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '4px solid var(--bg-surface)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  profile.fullName?.charAt(0) || 'U'
                )}
              </div>

              {/* Avatar Edit Overlay Button */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: '3px solid var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'transform 0.15s ease',
                }}
                title="Ganti Foto Profil"
              >
                <Camera size={16} />
              </button>
            </div>

            {/* Headline Details */}
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {profile.fullName}
                </h1>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                  <ShieldCheck size={12} style={{ marginRight: 4 }} />
                  {profile.role}
                </span>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                  {profile.employmentType}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: 16 }}>
                <span>{profile.email}</span>
                {profile.location && <span>• {profile.location}</span>}
              </div>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div style={{ display: 'flex', gap: '12px', paddingBottom: '8px' }}>
            <div
              style={{
                background: 'var(--bg-card-solid)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipe Status</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>Aktif & Terverifikasi</div>
            </div>
            {profile.employmentType === 'Consultant' && (
              <div
                style={{
                  background: 'var(--bg-card-solid)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tarif Per Jam</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning)' }}>
                  Rp {(profile.hourlyRate || 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card-solid)',
            padding: '0 32px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'details' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              transition: 'all 0.15s ease',
            }}
          >
            <User size={16} />
            <span>Informasi Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'security' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Key size={16} />
            <span>Keamanan & Password</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveProfile}>
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Biodata & Profil Lengkap
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Sesuaikan informasi profil publik dan data kontak kerja Anda.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Nama Lengkap
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleProfileChange}
                    required
                    className="form-control"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    placeholder="Nama Lengkap Anda"
                  />
                </div>
              </div>

              {/* Email (Readonly) */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Alamat Email (Akun Resmi)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="form-control"
                    style={{ paddingLeft: '40px', width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Nomor Telepon / WhatsApp
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleProfileChange}
                    className="form-control"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    placeholder="Contoh: 081234567890"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Lokasi / Domisili
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="location"
                    value={profile.location}
                    onChange={handleProfileChange}
                    className="form-control"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    placeholder="Contoh: Jakarta Selatan, Indonesia"
                  />
                </div>
              </div>

              {/* Company or Agency */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Perusahaan / Agensi / Unit
                </label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="companyOrAgency"
                    value={profile.companyOrAgency}
                    onChange={handleProfileChange}
                    className="form-control"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    placeholder="Nama Perusahaan atau Konsultan"
                  />
                </div>
              </div>

              {/* Hourly Rate (if consultant or admin) */}
              {profile.employmentType === 'Consultant' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Tarif Per Jam (IDR)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      name="hourlyRate"
                      value={profile.hourlyRate}
                      onChange={handleProfileChange}
                      className="form-control"
                      style={{ paddingLeft: '40px', width: '100%' }}
                      placeholder="150000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bio textarea */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Bio & Deskripsi Singkat
              </label>
              <textarea
                name="bio"
                rows={4}
                value={profile.bio}
                onChange={handleProfileChange}
                className="form-control"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Ceritakan keahlian profesional, portofolio, atau peran Anda di proyek..."
              />
            </div>

            {/* Save Button */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
              >
                <Save size={16} />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword}>
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Perbarui Kata Sandi
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Pastikan kata sandi baru Anda unik, kuat, dan terdiri dari minimal 6 karakter.
              </p>
            </div>

            {/* Old Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password Saat Ini
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type={showOldPass ? 'text' : 'password'}
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                  className="form-control"
                  style={{ paddingLeft: '40px', paddingRight: '42px', width: '100%' }}
                  placeholder="Masukkan password lama Anda"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password Baru
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  className="form-control"
                  style={{ paddingLeft: '40px', paddingRight: '42px', width: '100%' }}
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Konfirmasi Password Baru
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="form-control"
                  style={{ paddingLeft: '40px', paddingRight: '42px', width: '100%' }}
                  placeholder="Ketik ulang password baru Anda"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password notice card */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                marginBottom: '24px',
              }}
            >
              <ShieldCheck size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Sandi akun Anda diamankan dengan algoritma enkripsi satu arah BCrypt standar perbankan. Setelah sandi diganti, aktivitas akan dicatat pada Audit Trail sistem.
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
              >
                <Save size={16} />
                <span>{saving ? 'Menyimpan...' : 'Perbarui Password Akun'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
