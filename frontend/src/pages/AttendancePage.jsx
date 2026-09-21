import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, MapPin, Building2, Home, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { showToast, successAlert, errorAlert } from '../utils/swal';

export default function AttendancePage() {
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workMode, setWorkMode] = useState('WFO');
  const [locationNotes, setLocationNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history')
      ]);
      setTodayStatus(todayRes.data.data);
      setHistory(historyRes.data.data || []);
      if (todayRes.data.data?.workMode) {
        setWorkMode(todayRes.data.data.workMode);
      }
    } catch {
      showToast('Gagal memuat status presensi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const res = await api.post('/attendance/clock-in', {
        workMode,
        locationNotes: locationNotes || (workMode === 'WFO' ? 'Kantor Utama' : 'Remote / Rumah')
      });
      if (res.data.success) {
        await successAlert('Clock-In Berhasil!', res.data.message);
        fetchData();
      }
    } catch (err) {
      errorAlert('Gagal Clock-In', err.response?.data?.message || 'Terjadi kesalahan.');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.post('/attendance/clock-out');
      if (res.data.success) {
        await successAlert('Clock-Out Berhasil!', res.data.message);
        fetchData();
      }
    } catch (err) {
      errorAlert('Gagal Clock-Out', err.response?.data?.message || 'Terjadi kesalahan.');
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Presensi & Kehadiran Karyawan</h1>
          <p>Pencatatan jam kerja harian, pemilihan mode kerja (WFO/WFH), dan rekap riwayat kehadiran.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={16} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Clock-In Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Live Clock Card */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>
              <Clock size={18} />
              <span>Waktu Presensi Real-Time</span>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.04em', color: 'var(--text-primary)', marginBottom: 4 }}>
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Pilih Mode Kerja Hari Ini:
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!!todayStatus?.clockInTime}
                onClick={() => setWorkMode('WFO')}
                style={{
                  flex: 1,
                  background: workMode === 'WFO' ? 'var(--primary)' : 'var(--bg-card-solid)',
                  color: workMode === 'WFO' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600
                }}
              >
                <Building2 size={16} />
                <span>WFO (Kantor)</span>
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!!todayStatus?.clockInTime}
                onClick={() => setWorkMode('WFH')}
                style={{
                  flex: 1,
                  background: workMode === 'WFH' ? 'var(--secondary)' : 'var(--bg-card-solid)',
                  color: workMode === 'WFH' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600
                }}
              >
                <Home size={16} />
                <span>WFH (Rumah)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">
              <CalendarCheck size={20} style={{ color: 'var(--success)' }} />
              <span>Status Kehadiran Hari Ini</span>
            </div>

            {todayStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card-solid)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Jam Masuk (Clock-In)</span>
                  <strong style={{ color: 'var(--success)' }}>
                    {new Date(todayStatus.clockInTime).toLocaleTimeString('id-ID')}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card-solid)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Jam Pulang (Clock-Out)</span>
                  <strong>
                    {todayStatus.clockOutTime 
                      ? new Date(todayStatus.clockOutTime).toLocaleTimeString('id-ID')
                      : <span style={{ color: 'var(--warning)' }}>Belum Clock-Out</span>}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card-solid)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mode & Status</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="badge badge-primary">{todayStatus.workMode}</span>
                    <span className={`badge ${todayStatus.status === 'Present' ? 'badge-success' : 'badge-warning'}`}>
                      {todayStatus.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ color: 'var(--warning)', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Anda Belum Clock-In Hari Ini</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Silakan klik tombol Clock-In di bawah untuk mencatat kehadiran.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            {!todayStatus ? (
              <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={handleClockIn}>
                <CheckCircle2 size={18} />
                <span>Clock-In Sekarang ({workMode})</span>
              </button>
            ) : !todayStatus.clockOutTime ? (
              <button className="btn btn-danger btn-lg" style={{ width: '100%' }} onClick={handleClockOut}>
                <Clock size={18} />
                <span>Clock-Out (Selesai Kerja)</span>
              </button>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--success)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                ✓ Kehadiran hari ini telah lengkap dicatat!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="card">
        <div className="card-title">
          <CalendarCheck size={20} style={{ color: 'var(--primary)' }} />
          <span>Rekapitulasi Riwayat Kehadiran Bulanan</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Karyawan</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Mode Kerja</th>
                <th>Status</th>
                <th>Total Durasi</th>
                <th>Catatan / Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    Belum ada riwayat presensi yang tercatat.
                  </td>
                </tr>
              ) : (
                history.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>
                        {new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </strong>
                    </td>
                    <td>{a.userName}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {new Date(a.clockInTime).toLocaleTimeString('id-ID')}
                    </td>
                    <td>
                      {a.clockOutTime ? (
                        new Date(a.clockOutTime).toLocaleTimeString('id-ID')
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${a.workMode === 'WFO' ? 'badge-primary' : 'badge-secondary'}`}>
                        {a.workMode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${a.status === 'Present' ? 'badge-success' : 'badge-warning'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      {a.totalWorkingHours ? (
                        <strong style={{ color: 'var(--primary)' }}>{a.totalWorkingHours} Jam</strong>
                      ) : '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {a.locationNotes || a.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
