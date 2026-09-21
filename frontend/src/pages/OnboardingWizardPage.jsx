import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  Clock, 
  CalendarCheck, 
  LifeBuoy, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  User, 
  Check, 
  Building, 
  Shield 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { showToast } from '../utils/swal';

export default function OnboardingWizardPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    avatarUrl: user?.avatarUrl || '',
    companyOrAgency: user?.companyOrAgency || '',
    hourlyRate: user?.hourlyRate || 0,
  });

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/onboarding', profileData);
      if (res.data.success) {
        updateUser(res.data.data);
        showToast('Selamat! Onboarding selesai. Selamat bekerja!');
        navigate('/dashboard');
      }
    } catch {
      showToast('Gagal menyimpan profil onboarding', 'error');
    } finally {
      setLoading(false);
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
      <div className="card" style={{ maxWidth: 740, width: '100%', padding: '40px' }}>
        {/* Stepper Header */}
        <div className="wizard-steps">
          <div className={`wizard-step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="wizard-step-circle">
              {step > 1 ? <Check size={18} /> : '1'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Verifikasi Profil
            </span>
          </div>

          <div className={`wizard-step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="wizard-step-circle">
              {step > 2 ? <Check size={18} /> : '2'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Orientasi Peran
            </span>
          </div>

          <div className={`wizard-step-item ${step >= 3 ? 'active' : ''}`}>
            <div className="wizard-step-circle">
              {step === 3 ? <Sparkles size={18} /> : '3'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Tur Fitur Utama
            </span>
          </div>
        </div>

        {/* Step 1: Profiling */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Langkah 1: Verifikasi Data Profil Anda</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
              Pastikan nama dan avatar representatif sebelum Anda berkolaborasi dalam proyek.
            </p>

            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                className="form-control"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              />
            </div>

            {user?.employmentType === 'Consultant' && (
              <div className="form-group">
                <label className="form-label">Nama Perusahaan / Agensi Konsultan</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileData.companyOrAgency}
                  onChange={(e) => setProfileData({ ...profileData, companyOrAgency: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Pilih Avatar Foto Profil</label>
              <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                {avatars.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar ${idx + 1}`}
                    onClick={() => setProfileData({ ...profileData, avatarUrl: url })}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: profileData.avatarUrl === url ? '3px solid var(--primary)' : '2px solid var(--border-color)',
                      boxShadow: profileData.avatarUrl === url ? '0 0 12px var(--primary-glow)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                <span>Lanjut ke Orientasi Peran</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Role Orientation */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Langkah 2: Peran & Akses Kerja Anda</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
              Sistem telah mengonfigurasi alur kerja khusus berdasarkan jenis tenaga kerja Anda.
            </p>

            <div style={{
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {user?.role} ({user?.employmentType})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hak akses terverifikasi
                  </div>
                </div>
              </div>

              {user?.employmentType === 'Consultant' ? (
                <ul style={{ paddingLeft: 20, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li>Anda memiliki akses ke tugas proyek terkait di papan Kanban.</li>
                  <li><strong>Format Timesheet:</strong> Unggah laporan jam kerja bulanan berbasis file template (Excel/CSV) setiap akhir bulan.</li>
                  <li>Anda dapat melaporkan tiket kendala teknis kepada tim Caretaker proyek kapan saja.</li>
                </ul>
              ) : (
                <ul style={{ paddingLeft: 20, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li><strong>Presensi Harian:</strong> Lakukan Clock-In saat memulai kerja (pilih WFO atau WFH) dan Clock-Out saat selesai.</li>
                  <li><strong>Timesheet Kontinyu:</strong> Catat log jam kerja harian atau gunakan stopwatch live timer per tugas.</li>
                  <li>Akses kolaborasi catatan rapat (*Notes*) dan penanganan tiket proyek.</li>
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={18} />
                <span>Sebelumnya</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                <span>Lanjut ke Tur Fitur</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Feature Quick Tour */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: 8 }}>Langkah 3: Sekilas Fitur Unggulan</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
              Pelajari modul yang akan Anda gunakan sehari-hari:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              <div style={{ padding: '16px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
                  <CheckSquare size={18} />
                  <span>Manajemen Tugas</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Papan visual Kanban dengan drag-and-drop status: To Do, In Progress, In Review, dan Done.
                </p>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--secondary)', fontWeight: 700, marginBottom: 6 }}>
                  <Clock size={18} />
                  <span>Timesheet Dual-Mode</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Unggah berkas Excel bulanan untuk konsultan atau catat timer harian untuk anggota internal.
                </p>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--warning)', fontWeight: 700, marginBottom: 6 }}>
                  <LifeBuoy size={18} />
                  <span>Tiket & Caretaker Pool</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Laporkan kendala aplikasi langsung ke antrean caretaker untuk diinvestigasi dan diselesaikan.
                </p>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontWeight: 700, marginBottom: 6 }}>
                  <CalendarCheck size={18} />
                  <span>Presensi Kehadiran</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Clock-In & Clock-Out mudah dengan toggle mode WFO / WFH dan rekap kehadiran bulanan.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={18} />
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? 'Menyelesaikan...' : 'Selesaikan Onboarding & Mulai Bekerja'}
                <Sparkles size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
