import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckSquare, 
  Clock, 
  LifeBuoy, 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Sparkles,
  Plus
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, isConsultant } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [openTickets, setOpenTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsRes, tasksRes, ticketsRes] = await Promise.all([
          api.get('/reports/dashboard-stats'),
          api.get('/tasks'),
          api.get('/tickets?status=Open')
        ]);
        setStats(statsRes.data.data);
        setRecentTasks((tasksRes.data.data || []).slice(0, 5));
        setOpenTickets((ticketsRes.data.data || []).slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="page-body">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(14, 165, 233, 0.15) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase' }}>
            <Sparkles size={14} />
            <span>Selamat Datang Kembali</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{user?.fullName}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 4 }}>
            Anda masuk sebagai <strong style={{ color: 'var(--primary)' }}>{user?.role}</strong> ({user?.employmentType === 'Consultant' ? `Konsultan di ${user.companyOrAgency}` : 'Internal Employee'}).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {isConsultant ? (
            <Link to="/timesheets" className="btn btn-primary">
              <Clock size={16} />
              <span>Unggah Timesheet Bulanan</span>
            </Link>
          ) : (
            <Link to="/attendance" className="btn btn-success">
              <CalendarCheck size={16} />
              <span>Presensi Masuk / Pulang</span>
            </Link>
          )}
          <Link to="/tickets" className="btn btn-secondary">
            <LifeBuoy size={16} />
            <span>Laporkan Masalah</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <CheckSquare size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.totalActiveTasks ?? 0}</div>
            <div className="stat-label">Tugas Sedang Berjalan</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.completedTasks ?? 0}</div>
            <div className="stat-label">Tugas Selesai (Done)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <LifeBuoy size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.openTickets ?? 0}</div>
            <div className="stat-label">Tiket Terbuka (Open)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <Clock size={26} />
          </div>
          <div>
            <div className="stat-value">{stats?.totalLoggedHoursThisMonth ?? 0}h</div>
            <div className="stat-label">Total Jam Kerja Bulan Ini</div>
          </div>
        </div>
      </div>

      {/* Main Two Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Recent Tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <CheckSquare size={20} style={{ color: 'var(--primary)' }} />
              <span>Aktivitas Tugas Terkini</span>
            </div>
            <Link to="/tasks" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Lihat Kanban</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentTasks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada tugas</div>
            ) : (
              recentTasks.map(t => (
                <div key={t.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-card-solid)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {t.projectCode} • Assignee: {t.assigneeName || 'Belum ada'}
                    </div>
                  </div>
                  <span className={`badge ${
                    t.status === 'Done' ? 'badge-success' :
                    t.status === 'InProgress' ? 'badge-primary' : 'badge-secondary'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Caretaker Ticket Queue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <LifeBuoy size={20} style={{ color: 'var(--warning)' }} />
              <span>Kendala Masalah (Caretaker Pool)</span>
            </div>
            <Link to="/tickets" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Semua Tiket</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTickets.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Tidak ada tiket insiden berstatus Open saat ini.
              </div>
            ) : (
              openTickets.map(t => (
                <div key={t.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-card-solid)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>
                      {t.ticketNumber}
                    </span>
                    <span className={`badge ${
                      t.severity === 'Critical' ? 'badge-danger' :
                      t.severity === 'High' ? 'badge-warning' : 'badge-secondary'
                    }`}>
                      {t.severity}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Pelapor: {t.reportedByUserName} • Caretaker: {t.assignedCaretakerName || 'Antrean Terbuka'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
