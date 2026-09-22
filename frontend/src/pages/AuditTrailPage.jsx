import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Activity,
  Layers,
  Calendar,
  TrendingUp,
  X,
  Database
} from 'lucide-react';
import api from '../utils/api';
import { showToast } from '../utils/swal';
import { useSync } from '../context/SyncContext';

export default function AuditTrailPage() {
  const { syncTick } = useSync();
  const [logs, setLogs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Filters: User Name, Module, and Date Range (as specifically requested)
  const [filters, setFilters] = useState({
    module: 'All',
    userName: 'All',
    startDate: '',
    endDate: '',
    severity: 'All',
    search: '',
  });

  useEffect(() => {
    fetchDistinctUsers();
  }, []);

  useEffect(() => {
    fetchLogsAndTrend();
  }, [filters.module, filters.userName, filters.severity, filters.startDate, filters.endDate, syncTick]);

  const fetchDistinctUsers = async () => {
    try {
      const res = await api.get('/audit-logs/users');
      if (res.data && res.data.data) {
        setUserList(res.data.data);
      }
    } catch {
      // Fallback if users endpoint has any issue
    }
  };

  const fetchLogsAndTrend = async () => {
    try {
      setRefreshing(true);
      const params = {
        module: filters.module,
        userName: filters.userName,
        severity: filters.severity,
        search: filters.search,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(filters.endDate + 'T23:59:59').toISOString() : undefined,
        limit: 200,
      };

      const [logsRes, trendRes] = await Promise.all([
        api.get('/audit-logs', { params }),
        api.get('/audit-logs/trend', { 
          params: {
            module: filters.module,
            userName: filters.userName,
            startDate: params.startDate,
            endDate: params.endDate
          }
        })
      ]);

      if (logsRes.data && logsRes.data.data) {
        setLogs(logsRes.data.data);
      }
      if (trendRes.data && trendRes.data.data) {
        setTrendData(trendRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
      showToast('Gagal memuat jejak audit', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogsAndTrend();
  };

  // Quick Date Range Helpers
  const handleQuickRange = (days) => {
    if (days === 'all') {
      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
      return;
    }

    const end = new Date();
    const start = new Date();
    if (days === 0) {
      // Today
      const todayStr = end.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, startDate: todayStr, endDate: todayStr }));
    } else {
      start.setDate(end.getDate() - days);
      setFilters(prev => ({
        ...prev,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      }));
    }
  };

  const handleResetFilters = () => {
    setFilters({
      module: 'All',
      userName: 'All',
      startDate: '',
      endDate: '',
      severity: 'All',
      search: '',
    });
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'security':
        return <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Security</span>;
      case 'warning':
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Warning</span>;
      case 'error':
        return <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Error</span>;
      default:
        return <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Info</span>;
    }
  };

  const getModuleBadge = (module) => {
    const colorMap = {
      Auth: 'rgba(99, 102, 241, 0.15)',
      Profile: 'rgba(14, 165, 233, 0.15)',
      Tasks: 'rgba(16, 185, 129, 0.15)',
      Tickets: 'rgba(245, 158, 11, 0.15)',
      Timesheets: 'rgba(168, 85, 247, 0.15)',
      Attendance: 'rgba(20, 184, 166, 0.15)',
      MasterData: 'rgba(236, 72, 153, 0.15)',
      System: 'rgba(239, 68, 68, 0.15)',
      Database: 'rgba(244, 63, 94, 0.15)',
      Members: 'rgba(139, 92, 246, 0.15)',
      Reports: 'rgba(59, 130, 246, 0.15)',
    };
    const textColorMap = {
      Auth: 'var(--primary)',
      Profile: 'var(--secondary)',
      Tasks: 'var(--success)',
      Tickets: 'var(--warning)',
      Timesheets: 'var(--purple)',
      Attendance: '#14b8a6',
      MasterData: '#ec4899',
      System: 'var(--danger)',
      Database: '#f43f5e',
      Members: '#8b5cf6',
      Reports: '#3b82f6',
    };

    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: colorMap[module] || 'var(--bg-card-solid)',
          color: textColorMap[module] || 'var(--text-secondary)',
          display: 'inline-block',
        }}
      >
        {module}
      </span>
    );
  };

  // Metrics calculation
  const totalCount = logs.length;
  const securityCount = logs.filter((l) => l.severity?.toLowerCase() === 'security').length;
  const warningCount = logs.filter((l) => l.severity?.toLowerCase() === 'warning').length;

  // Chart Rendering Calculations
  const chartWidth = 900;
  const chartHeight = 220;
  const padding = { top: 25, right: 35, bottom: 35, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxVal = Math.max(...trendData.map(d => d.count), 5);

  const points = trendData.map((d, index) => {
    const x = trendData.length === 1 
      ? padding.left + innerWidth / 2
      : padding.left + (index / (trendData.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.count / maxVal) * innerHeight;
    return { ...d, x, y };
  });

  // Build SVG Path with smooth curves
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      path += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
    : '';

  return (
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Jejak Audit & Log Aktivitas (Audit Trail)
            </h1>
            <span className="badge badge-primary">Grafik Line & Filter Kepatuhan</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pantau aktivitas mutasi data secara visual dengan grafik garis serta filter detail berdasarkan Nama User, Modul, dan Rentang Waktu.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogsAndTrend}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Menyinkron...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Log Dimuat</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {totalCount} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>entri</span>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Kejadian Security</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--purple)', marginTop: 4 }}>
            {securityCount} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>peristiwa</span>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peringatan / Warning</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>
            {warningCount} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>peristiwa</span>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '18px 20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sinkronisasi Real-Time</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            Aktif (SignalR Hub)
          </div>
        </div>
      </div>

      {/* INTERACTIVE LINE CHART (Specifically Requested: "audit trail gunakan grafik chart dengan menggunakan line") */}
      <div className="card" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Tren Aktivitas Audit Trail (Line Chart)
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                Fluktuasi intensitas mutasi data harian berdasarkan filter yang diterapkan
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 12, height: 3, backgroundColor: 'var(--primary)', borderRadius: 2 }} />
              <span>Volume Log (Aktivitas)</span>
            </div>
          </div>
        </div>

        {/* SVG Line Chart Canvas */}
        <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
          {points.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada data aktivitas pada rentang filter ini.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
            >
              <defs>
                <linearGradient id="auditLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-Ticks */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const yPos = padding.top + innerHeight * (1 - ratio);
                const val = Math.round(maxVal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={chartWidth - padding.right}
                      y2={yPos}
                      stroke="var(--border-color)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={yPos + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area under line */}
              {areaPath && <path d={areaPath} fill="url(#auditLineGradient)" />}

              {/* Smooth Bezier Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points & Tooltips */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  {/* Invisible larger hit circle for easy hovering */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* Visible point circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.date === pt.date ? '6' : '4'}
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ transition: 'r 0.15s ease' }}
                  />

                  {/* X-axis label (date) */}
                  <text
                    x={pt.x}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {pt.date.split('-').slice(1).join('/')}
                  </text>
                </g>
              ))}
            </svg>
          )}

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100}%`,
              transform: 'translate(-50%, -120%)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: 140
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {hoveredPoint.date}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                {hoveredPoint.count} Aktivitas
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Modul utama: <strong>{hoveredPoint.topModule}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER TOOLBAR: Specifically User Name, Module, and Date Range */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Filter size={16} style={{ color: 'var(--primary)' }} />
            <span>Kriteria Filter Audit Trail</span>
          </div>

          {/* Quick Date Range Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginRight: 4 }}>Preset Tanggal:</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 9px' }}
              onClick={() => handleQuickRange(0)}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 9px' }}
              onClick={() => handleQuickRange(7)}
            >
              7 Hari
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 9px' }}
              onClick={() => handleQuickRange(30)}
            >
              30 Hari
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 9px' }}
              onClick={() => handleQuickRange('all')}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 9px', color: 'var(--danger)' }}
              onClick={handleResetFilters}
              title="Reset semua filter"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Inputs Row: Nama User, Modul, Tanggal Mulai, Tanggal Selesai, Search */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* FILTER 1: NAMA USER */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Nama Pengguna (User):
            </label>
            <select
              value={filters.userName}
              onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', height: '36px' }}
            >
              <option value="All">Semua Pengguna</option>
              {userList.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* FILTER 2: MODUL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Modul Sistem:
            </label>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', height: '36px' }}
            >
              <option value="All">Semua Modul</option>
              <option value="Auth">Auth & Sesi</option>
              <option value="MasterData">Master Data</option>
              <option value="Tasks">Tasks Kanban</option>
              <option value="Tickets">Tickets Pool</option>
              <option value="Timesheets">Timesheets</option>
              <option value="Attendance">Presensi</option>
              <option value="Members">Penerimaan Anggota</option>
              <option value="Reports">Laporan & Analitik</option>
              <option value="Profile">Profil Akun</option>
              <option value="System">Konfigurasi Sistem</option>
              <option value="Database">Database & Reset</option>
            </select>
          </div>

          {/* FILTER 3: RANGE WAKTU (START DATE) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Dari Tanggal:
            </label>
            <input
              type="date"
              className="form-control"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', height: '36px' }}
            />
          </div>

          {/* FILTER 3: RANGE WAKTU (END DATE) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Sampai Tanggal:
            </label>
            <input
              type="date"
              className="form-control"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', height: '36px' }}
            />
          </div>

          {/* SEARCH KEYWORD */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              Pencarian Teks:
            </label>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Aksi / detail..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '100%', height: '36px' }}
              />
            </form>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card-solid)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Waktu & IP</th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pengguna</th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Modul</th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aksi / Kejadian</th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rincian Payload</th>
                <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tingkat</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {log.ipAddress && ` • ${log.ipAddress}`}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#6366f1',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {log.userName ? log.userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {log.userName || 'Sistem Otomatis'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {log.userRole || 'System'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {getModuleBadge(log.module)}
                    </td>

                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.action}
                    </td>

                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                      <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {log.details || '-'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {getSeverityBadge(log.severity)}
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
