import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileSpreadsheet, Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast } from '../utils/swal';

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [timesheetSummary, setTimesheetSummary] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, summaryRes] = await Promise.all([
        api.get('/reports/dashboard-stats'),
        api.get(`/reports/timesheet-summary?month=${month}&year=${year}`)
      ]);
      setStats(statsRes.data.data);
      setTimesheetSummary(summaryRes.data.data || []);
    } catch {
      showToast('Gagal memuat analitik laporan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTimesheet = () => {
    window.open(`/api/reports/export/timesheets.csv?month=${month}&year=${year}`, '_blank');
    showToast('Mengunduh laporan rekapitulasi timesheet...');
  };

  const handleExportAttendance = () => {
    window.open(`/api/reports/export/attendance.csv?month=${month}&year=${year}`, '_blank');
    showToast('Mengunduh laporan rekapitulasi presensi...');
  };

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Laporan Eksekutif & Rekapitulasi Data</h1>
          <p>Analisis jam kerja tenaga kerja internal vs konsultan, efektivitas proyek, dan ekspor CSV/Excel.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleExportAttendance}>
            <Download size={16} />
            <span>Ekspor Presensi (CSV)</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportTimesheet}>
            <FileSpreadsheet size={16} />
            <span>Ekspor Timesheet (CSV)</span>
          </button>
        </div>
      </div>

      {/* Month Picker Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '14px 20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Calendar size={16} />
          <span>Periode Analitik:</span>
        </div>
        <div style={{ width: 200 }}>
          <Select2
            options={monthNames.map((m, i) => ({ value: i + 1, label: m }))}
            value={month}
            onChange={(val) => setMonth(val)}
          />
        </div>
        <input
          type="number"
          className="form-control"
          style={{ width: 120 }}
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
      </div>

      {/* Hour Comparison Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <Users size={14} />
            <span>Jam Kerja Karyawan Internal</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 8, color: 'var(--primary)' }}>
            {stats?.internalHoursThisMonth ?? 0} Jam
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Berdasarkan input daily continuous log & stopwatch
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <Clock size={14} />
            <span>Jam Kerja Konsultan Eksternal</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 8, color: 'var(--warning)' }}>
            {stats?.consultantHoursThisMonth ?? 0} Jam
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Berdasarkan upload berkas bulanan resmi
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <CheckCircle size={14} />
            <span>Total Log Jam Kerja Keseluruhan</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 8, color: 'var(--success)' }}>
            {stats?.totalLoggedHoursThisMonth ?? 0} Jam
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Total kapasitas jam kerja tercatat bulan ini
          </p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="card">
        <div className="card-title">
          <FileSpreadsheet size={20} style={{ color: 'var(--primary)' }} />
          <span>Rincian Rekapitulasi Jam Kerja per Anggota ({monthNames[month - 1]} {year})</span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nama Anggota</th>
                <th>Tipe Tenaga Kerja</th>
                <th>Instansi / Perusahaan</th>
                <th>Proyek Dialokasikan</th>
                <th>Metode Input</th>
                <th>Total Jam</th>
                <th>Status Approval</th>
              </tr>
            </thead>
            <tbody>
              {timesheetSummary.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
                    Belum ada data rekonsiliasi timesheet untuk periode ini.
                  </td>
                </tr>
              ) : (
                timesheetSummary.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.userEmail}</div>
                    </td>
                    <td>
                      <span className={`badge ${item.employmentType === 'Consultant' ? 'badge-warning' : 'badge-primary'}`}>
                        {item.employmentType}
                      </span>
                    </td>
                    <td>{item.companyOrAgency}</td>
                    <td>{item.projectName}</td>
                    <td>
                      <span className="badge badge-secondary">{item.submissionType}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{item.totalHours} Jam</strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        item.status === 'Approved' ? 'badge-success' :
                        item.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {item.status}
                      </span>
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
