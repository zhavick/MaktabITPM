import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Building, 
  Shield, 
  Search, 
  Clock, 
  RefreshCw 
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast, confirmDialog, successAlert, errorAlert } from '../utils/swal';

export default function MembersManagementPage() {
  const [activeTab, setActiveTab] = useState('pending'); // pending, active
  const [pendingMembers, setPendingMembers] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'InternalEmployee',
    employmentType: 'Internal',
    companyOrAgency: '',
    hourlyRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, activeRes] = await Promise.all([
        api.get('/members/pending'),
        api.get('/members')
      ]);
      setPendingMembers(pendingRes.data.data || []);
      setActiveMembers(activeRes.data.data || []);
    } catch {
      showToast('Gagal memuat daftar anggota', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (member) => {
    const confirmed = await confirmDialog({
      title: `Setujui Anggota Baru?`,
      text: `Pengguna ${member.fullName} (${member.employmentType}) akan diaktifkan ke dalam sistem.`,
      icon: 'question',
      confirmButtonText: 'Ya, Setujui Akun',
      confirmButtonColor: '#10b981'
    });

    if (confirmed) {
      try {
        const res = await api.post(`/members/${member.id}/approve`, {
          action: 'Approve',
          assignedRole: member.role
        });
        if (res.data.success) {
          showToast(res.data.message);
          fetchData();
        }
      } catch {
        errorAlert('Gagal', 'Terjadi kesalahan saat menyetujui akun.');
      }
    }
  };

  const handleReject = async (member) => {
    const confirmed = await confirmDialog({
      title: `Tolak Pendaftaran?`,
      text: `Permohonan pendaftaran ${member.fullName} akan ditolak.`,
      icon: 'warning',
      confirmButtonText: 'Tolak Permohonan',
      confirmButtonColor: '#ef4444'
    });

    if (confirmed) {
      try {
        const res = await api.post(`/members/${member.id}/reject`, {
          action: 'Reject',
          reason: 'Tidak memenuhi kualifikasi proyek saat ini.'
        });
        if (res.data.success) {
          showToast(res.data.message, 'warning');
          fetchData();
        }
      } catch {
        errorAlert('Gagal', 'Terjadi kesalahan saat menolak akun.');
      }
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/members/invite', inviteForm);
      if (res.data.success) {
        setShowInviteModal(false);
        await successAlert(
          'Undangan Berhasil Dibuat!',
          `${res.data.message}`
        );
        fetchData();
        setInviteForm({
          fullName: '',
          email: '',
          role: 'InternalEmployee',
          employmentType: 'Internal',
          companyOrAgency: '',
          hourlyRate: 0,
        });
      }
    } catch (err) {
      errorAlert('Gagal Mengundang', err.response?.data?.message || 'Terjadi kesalahan.');
    }
  };

  const roleOptions = [
    { value: 'InternalEmployee', label: 'Internal Employee (Developer / Staff)', badge: 'Staff' },
    { value: 'Consultant', label: 'External Consultant (Mitra Ahli)', badge: 'Vendor' },
    { value: 'Caretaker', label: 'Caretaker (Pemelihara Aplikasi / Proyek)', badge: 'Support' },
    { value: 'ProjectManager', label: 'Project Manager (PM)', badge: 'Lead' },
    { value: 'Admin', label: 'System Administrator', badge: 'Super' },
  ];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Penerimaan & Manajemen Anggota</h1>
          <p>Tinjau permohonan anggota baru, setujui hak akses, dan kelola tenaga kerja internal maupun konsultan.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchData} title="Muat Ulang Data">
            <RefreshCw size={16} />
            <span>Segarkan</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={16} />
            <span>Undang Anggota Langsung</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          className="btn"
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'pending' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Clock size={16} />
          <span>Menunggu Persetujuan</span>
          {pendingMembers.length > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 6 }}>
              {pendingMembers.length}
            </span>
          )}
        </button>
        <button
          className="btn"
          onClick={() => setActiveTab('active')}
          style={{
            background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'active' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'active' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Users size={16} />
          <span>Direktori Anggota Aktif ({activeMembers.length})</span>
        </button>
      </div>

      {/* Pending Approval Tab */}
      {activeTab === 'pending' && (
        <div className="card">
          <div className="card-title">
            <Clock size={20} style={{ color: 'var(--warning)' }} />
            <span>Permohonan Pendaftaran Akun (Pending Approval)</span>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat data permohonan...</div>
          ) : pendingMembers.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12, display: 'inline-block' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Permohonan Pending</div>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Semua pendaftaran anggota baru telah ditinjau dan disetujui.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nama & Email</th>
                    <th>Tipe Tenaga Kerja</th>
                    <th>Perusahaan / Agensi</th>
                    <th>Tanggal Pengajuan</th>
                    <th style={{ textAlign: 'right' }}>Aksi Persetujuan</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${m.employmentType === 'Consultant' ? 'badge-warning' : 'badge-primary'}`}>
                          {m.employmentType === 'Consultant' ? 'Konsultan Eksternal' : 'Karyawan Internal'}
                        </span>
                      </td>
                      <td>
                        {m.companyOrAgency ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>{m.companyOrAgency}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>{new Date(m.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(m)}
                            title="Setujui Anggota"
                          >
                            <CheckCircle size={15} />
                            <span>Setujui</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(m)}
                            title="Tolak Pendaftaran"
                          >
                            <XCircle size={15} />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Members Tab */}
      {activeTab === 'active' && (
        <div className="card">
          <div className="card-title">
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <span>Daftar Seluruh Anggota Aktif</span>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Anggota</th>
                  <th>Role Sistem</th>
                  <th>Tipe Hubungan</th>
                  <th>Instansi / Billing Rate</th>
                  <th>Status Onboarding</th>
                  <th>Bergabung Sejak</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{m.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{m.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${m.employmentType === 'Consultant' ? 'badge-warning' : 'badge-primary'}`}>
                        {m.employmentType}
                      </span>
                    </td>
                    <td>
                      {m.companyOrAgency ? (
                        <div>
                          <div>{m.companyOrAgency}</div>
                          {m.hourlyRate > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                              Rp {m.hourlyRate.toLocaleString('id-ID')} / jam
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Internal Corporate</span>
                      )}
                    </td>
                    <td>
                      {m.onboardingCompleted ? (
                        <span className="badge badge-success">Selesai</span>
                      ) : (
                        <span className="badge badge-secondary">Belum Selesai</span>
                      )}
                    </td>
                    <td>{new Date(m.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Direct Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} style={{ color: 'var(--primary)' }} />
                <span>Undang Anggota Tim Baru</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleInviteSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Rian Pratama"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Alamat Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@domain.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Peran Sistem (Role)</label>
                  <Select2
                    options={roleOptions}
                    value={inviteForm.role}
                    onChange={(val) => {
                      setInviteForm({
                        ...inviteForm,
                        role: val,
                        employmentType: val === 'Consultant' ? 'Consultant' : 'Internal'
                      });
                    }}
                  />
                </div>

                {inviteForm.employmentType === 'Consultant' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Perusahaan / Agensi Konsultan</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: CV Digital Mitra"
                        value={inviteForm.companyOrAgency}
                        onChange={(e) => setInviteForm({ ...inviteForm, companyOrAgency: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tarif Billing per Jam (IDR)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Contoh: 300000"
                        value={inviteForm.hourlyRate}
                        onChange={(e) => setInviteForm({ ...inviteForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </>
                )}

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card-solid)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  💡 Akun yang diundang langsung oleh Admin akan berstatus <strong>Active</strong> secara otomatis dengan password sementara: <code>Password123!</code>.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus size={16} />
                  <span>Kirim Undangan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
