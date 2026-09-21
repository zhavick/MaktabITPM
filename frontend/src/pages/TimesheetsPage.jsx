import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  FileText, 
  AlertCircle,
  Plus
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { useAuth } from '../context/AuthContext';
import { showToast, confirmDialog, successAlert, errorAlert } from '../utils/swal';

export default function TimesheetsPage() {
  const { user, isConsultant, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState(isConsultant ? 'consultant' : 'internal');
  const [myTimesheets, setMyTimesheets] = useState([]);
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Consultant Upload State
  const [uploadProjectId, setUploadProjectId] = useState(null);
  const [uploadMonth, setUploadMonth] = useState(new Date().getMonth() + 1);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Internal Continuous Log State
  const [internalLog, setInternalLog] = useState({
    projectId: null,
    taskId: null,
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    activityDescription: '',
  });

  // Stopwatch State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(sec => sec + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, projRes, taskRes] = await Promise.all([
        api.get('/timesheets/my'),
        api.get('/projects'),
        api.get('/tasks')
      ]);
      setMyTimesheets(myRes.data.data || []);
      setProjects(projRes.data.data || []);
      setTasks(taskRes.data.data || []);

      if (projRes.data.data?.length > 0) {
        setUploadProjectId(projRes.data.data[0].id);
        setInternalLog(prev => ({ ...prev, projectId: projRes.data.data[0].id }));
      }

      if (isManager) {
        const allRes = await api.get('/timesheets/all');
        setAllTimesheets(allRes.data.data || []);
      }
    } catch {
      showToast('Gagal memuat data timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Download official template
  const handleDownloadTemplate = (format = 'xlsx') => {
    window.open(`/api/timesheets/consultant/template?format=${format}`, '_blank');
    showToast(`Template Timesheet (${format.toUpperCase()}) sedang diunduh!`);
  };

  // Consultant Upload Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      errorAlert('Pilih Berkas', 'Silakan pilih berkas Excel (.xlsx) atau CSV.');
      return;
    }
    if (!uploadProjectId) {
      errorAlert('Pilih Proyek', 'Silakan tentukan proyek tujuan.');
      return;
    }

    const formData = new FormData();
    formData.append('File', selectedFile);
    formData.append('ProjectId', uploadProjectId);
    formData.append('PeriodMonth', uploadMonth);
    formData.append('PeriodYear', uploadYear);

    setUploading(true);
    try {
      const res = await api.post('/timesheets/consultant/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        await successAlert('Berhasil Diunggah!', res.data.message);
        setSelectedFile(null);
        fetchData();
      }
    } catch (err) {
      errorAlert('Gagal Mengunggah', err.response?.data?.message || 'Terjadi kesalahan pada validasi berkas.');
    } finally {
      setUploading(false);
    }
  };

  // Internal Continuous Log Handler
  const handleInternalLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/timesheets/internal/log', internalLog);
      if (res.data.success) {
        showToast(res.data.message);
        setInternalLog({
          ...internalLog,
          hours: 8,
          activityDescription: ''
        });
        fetchData();
      }
    } catch {
      errorAlert('Gagal', 'Gagal menyimpan log jam kerja.');
    }
  };

  // Stopwatch stop & populate hours
  const handleStopTimer = () => {
    setIsTimerRunning(false);
    const calculatedHours = Math.max(0.25, parseFloat((timerSeconds / 3600).toFixed(2)));
    setInternalLog(prev => ({ ...prev, hours: calculatedHours }));
    showToast(`Timer dihentikan: ${calculatedHours} jam dimasukkan ke form input.`);
  };

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Manager Approval / Rejection
  const handleReview = async (timesheetId, action) => {
    const isApprove = action === 'Approve';
    const confirmed = await confirmDialog({
      title: `${isApprove ? 'Setujui' : 'Tolak'} Timesheet?`,
      text: `Status timesheet akan diubah menjadi ${isApprove ? 'Approved' : 'Rejected'}.`,
      icon: isApprove ? 'question' : 'warning',
      confirmButtonText: isApprove ? 'Ya, Setujui' : 'Tolak',
      confirmButtonColor: isApprove ? '#10b981' : '#ef4444'
    });

    if (confirmed) {
      try {
        const res = await api.post(`/timesheets/${timesheetId}/review`, {
          action,
          reviewNotes: isApprove ? 'Disetujui oleh Project Manager.' : 'Harap lengkapi uraian pekerjaan.'
        });
        if (res.data.success) {
          showToast(res.data.message);
          fetchData();
        }
      } catch {
        errorAlert('Gagal', 'Gagal memproses review timesheet.');
      }
    }
  };

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
    badge: p.code
  }));

  const taskOptions = tasks.map(t => ({
    value: t.id,
    label: t.title,
    subLabel: `${t.projectCode} • ${t.status}`
  }));

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Manajemen Timesheet (Dual-Mode)</h1>
          <p>Mendukung pelaporan bulanan konsultan (upload Excel/CSV) serta logging kontinyu harian untuk karyawan internal.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          className="btn"
          onClick={() => setActiveTab('consultant')}
          style={{
            background: activeTab === 'consultant' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'consultant' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'consultant' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <UploadCloud size={16} />
          <span>Upload Bulanan Konsultan</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('internal')}
          style={{
            background: activeTab === 'internal' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'internal' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'internal' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Clock size={16} />
          <span>Log Harian Internal & Stopwatch</span>
        </button>

        {isManager && (
          <button
            className="btn"
            onClick={() => setActiveTab('review')}
            style={{
              background: activeTab === 'review' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'review' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'review' ? 700 : 500,
              borderRadius: 'var(--radius-md)'
            }}
          >
            <CheckCircle size={16} />
            <span>Review & Persetujuan PM ({allTimesheets.filter(t => t.status === 'Submitted').length} Pending)</span>
          </button>
        )}
      </div>

      {/* 1. CONSULTANT UPLOAD MODE */}
      {activeTab === 'consultant' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div className="card">
            <div className="card-title">
              <UploadCloud size={20} style={{ color: 'var(--primary)' }} />
              <span>Unggah Timesheet Bulanan Konsultan</span>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: 20
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={16} style={{ color: 'var(--primary)' }} />
                <span>Format Template Resmi:</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                Unduh template resmi berstandar proyek sebelum mengisi rekonsiliasi jam kerja bulanan Anda:
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDownloadTemplate('xlsx')}>
                  <Download size={14} />
                  <span>Download Template Excel (.xlsx)</span>
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDownloadTemplate('csv')}>
                  <Download size={14} />
                  <span>Download Template CSV</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label className="form-label">Proyek Terkait</label>
                <Select2
                  options={projectOptions}
                  value={uploadProjectId}
                  onChange={(val) => setUploadProjectId(val)}
                  placeholder="Pilih proyek..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Bulan Periode</label>
                  <Select2
                    options={monthNames.map((m, i) => ({ value: i + 1, label: m }))}
                    value={uploadMonth}
                    onChange={(val) => setUploadMonth(val)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tahun Periode</label>
                  <input
                    type="number"
                    className="form-control"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih Berkas Laporan (.xlsx, .csv)</label>
                <div style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="timesheet-upload-input"
                  />
                  <label htmlFor="timesheet-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                    <UploadCloud size={32} style={{ color: 'var(--primary)', marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {selectedFile ? selectedFile.name : 'Klik untuk memilih berkas atau seret ke sini'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Format didukung: Microsoft Excel (.xlsx), CSV (.csv) Maks. 10MB
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={uploading}
              >
                {uploading ? 'Memvalidasi & Mengunggah...' : 'Unggah & Ajukan Timesheet Bulanan'}
              </button>
            </form>
          </div>

          {/* Timesheet Submission History */}
          <div className="card">
            <div className="card-title">
              <Clock size={20} style={{ color: 'var(--secondary)' }} />
              <span>Riwayat Pengajuan Timesheet Anda</span>
            </div>

            {myTimesheets.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Belum ada berkas timesheet yang diajukan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myTimesheets.map(ts => (
                  <div key={ts.id} style={{
                    padding: '14px 16px',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {monthNames[ts.periodMonth - 1]} {ts.periodYear}
                      </span>
                      <span className={`badge ${
                        ts.status === 'Approved' ? 'badge-success' :
                        ts.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {ts.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Proyek: <strong>{ts.projectName}</strong> • Total: <strong style={{ color: 'var(--primary)' }}>{ts.totalHours} Jam</strong>
                    </div>

                    {ts.originalFileName && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Berkas: {ts.originalFileName}
                      </div>
                    )}

                    {ts.reviewNotes && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Catatan Reviewer: {ts.reviewNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INTERNAL DAILY CONTINUOUS LOG MODE */}
      {activeTab === 'internal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div className="card">
            <div className="card-title">
              <Clock size={20} style={{ color: 'var(--primary)' }} />
              <span>Input Log Aktivitas Harian Internal</span>
            </div>

            {/* Stopwatch Live Timer Widget */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Live Work Timer
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {formatTimer(timerSeconds)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Gunakan stopwatch saat mengerjakan tugas untuk akurasi jam
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {!isTimerRunning ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsTimerRunning(true)}
                  >
                    <Play size={16} />
                    <span>Mulai Timer</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleStopTimer}
                  >
                    <Square size={16} />
                    <span>Stop & Masukkan Jam</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleInternalLogSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Pengerjaan</label>
                  <input
                    type="date"
                    className="form-control"
                    value={internalLog.date}
                    onChange={(e) => setInternalLog({ ...internalLog, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Durasi (Jam)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="form-control"
                    value={internalLog.hours}
                    onChange={(e) => setInternalLog({ ...internalLog, hours: parseFloat(e.target.value) || 0 })}
                    required
                    min="0.1"
                    max="24"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proyek</label>
                <Select2
                  options={projectOptions}
                  value={internalLog.projectId}
                  onChange={(val) => setInternalLog({ ...internalLog, projectId: val })}
                  placeholder="Pilih proyek..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tugas Terkait (Opsional)</label>
                <Select2
                  options={[{ value: null, label: 'Tanpa Tugas Khusus' }, ...taskOptions]}
                  value={internalLog.taskId}
                  onChange={(val) => setInternalLog({ ...internalLog, taskId: val })}
                  placeholder="Pilih tugas spesifik..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rincian Aktivitas / Hasil Pekerjaan</label>
                <textarea
                  className="form-control"
                  placeholder="Jelaskan apa yang Anda selesaikan hari ini..."
                  value={internalLog.activityDescription}
                  onChange={(e) => setInternalLog({ ...internalLog, activityDescription: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} />
                <span>Simpan Log Jam Kerja</span>
              </button>
            </form>
          </div>

          {/* Quick Recap */}
          <div className="card">
            <div className="card-title">
              <Calendar size={20} style={{ color: 'var(--success)' }} />
              <span>Log Pekerjaan Bulan Ini</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myTimesheets.filter(ts => ts.submissionType === 'InternalDaily').flatMap(ts => ts.entries).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Belum ada catatan aktivitas hari ini.
                </div>
              ) : (
                myTimesheets.filter(ts => ts.submissionType === 'InternalDaily').flatMap(ts => ts.entries).map(e => (
                  <div key={e.id} style={{
                    padding: '12px 14px',
                    background: 'var(--bg-card-solid)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {new Date(e.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {e.hours} Jam
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {e.activityDescription}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGER REVIEW MODE */}
      {activeTab === 'review' && isManager && (
        <div className="card">
          <div className="card-title">
            <CheckCircle size={20} style={{ color: 'var(--primary)' }} />
            <span>Antrean Peninjauan Timesheet (Project Manager / Finance)</span>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Pengirim</th>
                  <th>Tipe Hubungan</th>
                  <th>Proyek</th>
                  <th>Periode</th>
                  <th>Total Jam</th>
                  <th>Metode Submit</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi Persetujuan</th>
                </tr>
              </thead>
              <tbody>
                {allTimesheets.map((ts) => (
                  <tr key={ts.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{ts.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ts.userEmail}</div>
                    </td>
                    <td>
                      <span className={`badge ${ts.employmentType === 'Consultant' ? 'badge-warning' : 'badge-primary'}`}>
                        {ts.employmentType}
                      </span>
                    </td>
                    <td>{ts.projectName}</td>
                    <td>{monthNames[ts.periodMonth - 1]} {ts.periodYear}</td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{ts.totalHours} Jam</strong>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{ts.submissionType}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        ts.status === 'Approved' ? 'badge-success' :
                        ts.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {ts.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ts.status === 'Submitted' ? (
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReview(ts.id, 'Approve')}
                            title="Setujui Timesheet"
                          >
                            <CheckCircle size={15} />
                            <span>Setujui</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReview(ts.id, 'Reject')}
                            title="Tolak Timesheet"
                          >
                            <XCircle size={15} />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Telah ditinjau</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
