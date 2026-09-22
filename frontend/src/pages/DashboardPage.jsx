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
  Plus,
  PieChart,
  BarChart3,
  Layers,
  Activity,
  CheckCircle2,
  Tag,
  Flag
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, isConsultant } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [openTickets, setOpenTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsRes, analyticsRes, tasksRes, ticketsRes] = await Promise.all([
          api.get('/reports/dashboard-stats'),
          api.get('/reports/executive-analytics'),
          api.get('/tasks'),
          api.get('/tickets?status=Open')
        ]);
        setStats(statsRes.data.data);
        setAnalytics(analyticsRes.data.data);
        setRecentTasks((tasksRes.data.data || []).slice(0, 5));
        setOpenTickets((ticketsRes.data.data || []).slice(0, 4));
      } catch (err) {
        console.error("Gagal memuat analitik dashboard:", err);
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
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase' }}>
            <Sparkles size={14} />
            <span>Dashboard Eksekutif & Manajemen Proyek</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Selamat Datang, {user?.fullName}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: 4, marginBottom: 0 }}>
            Masuk sebagai <strong style={{ color: 'var(--primary)' }}>{user?.role}</strong> ({user?.employmentType === 'Consultant' ? `Konsultan di ${user.companyOrAgency}` : 'Internal Employee'}).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isConsultant ? (
            <Link to="/timesheets" className="btn btn-primary">
              <Clock size={16} />
              <span>Timesheet Bulanan</span>
            </Link>
          ) : (
            <Link to="/attendance" className="btn btn-success">
              <CalendarCheck size={16} />
              <span>Presensi Karyawan</span>
            </Link>
          )}
          <Link to="/tasks" className="btn btn-secondary">
            <CheckSquare size={16} />
            <span>Papan Tugas</span>
          </Link>
          <Link to="/tickets" className="btn btn-secondary">
            <LifeBuoy size={16} />
            <span>Laporkan Isu</span>
          </Link>
        </div>
      </div>

      {/* Top 4 Metric Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
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

      {/* Visual Analytics Row 1: Status Donut Chart & Team Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Card 1: Interactive Donut Chart for Task Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            <div className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChart size={19} style={{ color: 'var(--primary)' }} />
              <span>Distribusi Status Tugas</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tingkat Selesai: <strong style={{ color: 'var(--success)' }}>{analytics?.completionRate ?? 0}%</strong>
            </span>
          </div>

          <StatusDonutChart 
            statusBreakdown={analytics?.statusBreakdown || []}
            totalTasks={analytics?.totalTasks ?? 0}
            completionRate={analytics?.completionRate ?? 0}
          />

          {/* Category Badges Footer */}
          {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Tag size={13} />
                <span>KATEGORI PEKERJAAN TERBANYAK</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {analytics.categoryBreakdown.map(c => (
                  <span key={c.category} style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <span>{c.category}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Team Workload & Member Capacity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            <div className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={19} style={{ color: '#0ea5e9' }} />
              <span>Beban Kerja & Kapasitas Tim</span>
            </div>
            <Link to="/members" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>Daftar Tim</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <TeamWorkloadSection teamWorkload={analytics?.teamWorkload || []} />
        </div>
      </div>

      {/* Visual Analytics Row 2: Project SDLC Milestone Roadmap */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={19} style={{ color: '#8b5cf6' }} />
            <span>Pelacakan Siklus SDLC Proyek Aktif</span>
          </div>
          <Link to="/master-data" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>Master Proyek</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <ProjectSdlcTracker projectProgress={analytics?.projectProgress || []} />
      </div>

      {/* Main Two Columns: Recent Tasks & Open Incident Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        {/* Recent Tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <CheckSquare size={19} style={{ color: 'var(--primary)' }} />
              <span>Aktivitas Tugas Terkini</span>
            </div>
            <Link to="/tasks" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Lihat Kanban / Grid</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentTasks.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada tugas tercatat.</div>
            ) : (
              recentTasks.map(t => (
                <div key={t.id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-card-solid)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${t.projectColor || '#6366f1'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {t.projectCode || t.projectName} • PIC: {t.assigneeName || 'Belum ada'}
                    </div>
                  </div>
                  <span className={`badge ${
                    t.status === 'Done' ? 'badge-success' :
                    t.status === 'InProgress' ? 'badge-primary' :
                    t.status === 'InReview' ? 'badge-warning' : 'badge-secondary'
                  }`} style={{ fontSize: '0.72rem' }}>
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
              <LifeBuoy size={19} style={{ color: 'var(--warning)' }} />
              <span>Kendala Masalah (Caretaker Pool)</span>
            </div>
            <Link to="/tickets" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Semua Tiket</span>
              <ArrowUpRight size={14} />
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
                    }`} style={{ fontSize: '0.72rem' }}>
                      {t.severity}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{t.title}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
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

/* --- Interactive SVG Donut Chart --- */
function StatusDonutChart({ statusBreakdown, totalTasks, completionRate }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20, padding: '6px 0' }}>
      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="18"
          />
          {/* Slices */}
          {totalTasks > 0 ? (
            statusBreakdown.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              if (item.count === 0) return null;

              return (
                <circle
                  key={item.status}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke-dasharray 0.6s ease' }}
                />
              );
            })
          ) : (
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#6366f1"
              strokeWidth="18"
              strokeDasharray={`0 ${circumference}`}
            />
          )}
        </svg>

        {/* Center Text inside Donut */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {totalTasks}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
            TOTAL TUGAS
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 700, marginTop: 2 }}>
            {completionRate}% Selesai
          </span>
        </div>
      </div>

      {/* Legend List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 170, flex: 1 }}>
        {statusBreakdown.map(item => (
          <div key={item.status} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 10px',
            background: 'var(--bg-card-solid)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.color }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: 'var(--text-muted)' }}>{item.count}</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: item.color,
                background: `${item.color}18`,
                padding: '2px 6px',
                borderRadius: 4
              }}>
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Team Workload Section --- */
function TeamWorkloadSection({ teamWorkload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {teamWorkload.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada data penugasan anggota tim.
        </div>
      ) : (
        teamWorkload.map(member => {
          const total = Math.max(member.totalTasks, 1);
          const donePct = (member.completedTasks / total) * 100;
          const activePct = (member.activeTasks / total) * 100;

          return (
            <div key={member.userId} style={{
              padding: '9px 12px',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#4f46e5',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {member.fullName.charAt(0)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      {member.fullName}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                      • {member.role}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: '#6366f1' }}>{member.activeTasks}</strong> aktif • <strong style={{ color: '#10b981' }}>{member.completedTasks}</strong> selesai
                  </span>
                  {member.totalEstimatedHours > 0 && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      {member.totalEstimatedHours}h
                    </span>
                  )}
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div style={{
                height: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 3,
                overflow: 'hidden',
                display: 'flex'
              }}>
                <div style={{ width: `${donePct}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Selesai: ${member.completedTasks}`} />
                <div style={{ width: `${activePct}%`, background: '#6366f1', transition: 'width 0.4s ease' }} title={`Aktif: ${member.activeTasks}`} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* --- Project SDLC Milestone Tracker --- */
function ProjectSdlcTracker({ projectProgress }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {projectProgress.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada proyek aktif yang terdaftar.
        </div>
      ) : (
        projectProgress.map(p => (
          <div key={p.id} style={{
            padding: '12px 16px',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            borderLeft: `5px solid ${p.color || '#4f46e5'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  backgroundColor: `${p.color || '#4f46e5'}20`,
                  color: p.color || '#4f46e5',
                  border: `1px solid ${p.color || '#4f46e5'}40`
                }}>
                  {p.code}
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  ({p.clientName})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Penyelesaian: <strong style={{ color: p.color || 'var(--primary)' }}>{p.progressPercentage}%</strong> ({p.completedTasks}/{p.totalTasks} tugas)
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div style={{
              height: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${p.progressPercentage}%`,
                background: p.color || 'var(--primary)',
                height: '100%',
                borderRadius: 3,
                transition: 'width 0.5s ease'
              }} />
            </div>

            {/* SDLC 6-Step Roadmap */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
              gap: 6,
              paddingTop: 4
            }}>
              {p.milestones.map(m => {
                const statusColor = m.isCompleted
                  ? '#10b981'
                  : m.isActive
                  ? p.color || '#6366f1'
                  : 'var(--text-muted)';
                const statusBg = m.isCompleted
                  ? 'rgba(16, 185, 129, 0.12)'
                  : m.isActive
                  ? `${p.color || '#6366f1'}18`
                  : 'rgba(255, 255, 255, 0.03)';
                const statusBorder = m.isCompleted
                  ? 'rgba(16, 185, 129, 0.3)'
                  : m.isActive
                  ? `${p.color || '#6366f1'}40`
                  : 'var(--border-color)';

                return (
                  <div key={m.step} style={{
                    padding: '5px 7px',
                    background: statusBg,
                    border: `1px solid ${statusBorder}`,
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }} title={`${m.name}: ${m.taskCount} tugas`}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: statusColor, marginBottom: 2 }}>
                      {m.isCompleted ? '✓ TAHAP ' + m.step : 'TAHAP ' + m.step}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: m.isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {m.shortName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
