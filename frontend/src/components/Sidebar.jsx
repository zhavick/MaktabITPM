import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Clock, 
  CalendarCheck, 
  LifeBuoy, 
  BarChart3, 
  Users, 
  LogOut,
  FolderKanban,
  ShieldCheck,
  Briefcase,
  Settings,
  History,
  UserCheck,
  Database,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmDialog } from '../utils/swal';

export default function Sidebar() {
  const { user, logout, isManager, isAdmin, isConsultant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isTasksActive = location.pathname === '/tasks' || location.pathname === '/my-tasks';
  const [tasksMenuOpen, setTasksMenuOpen] = useState(isTasksActive);

  useEffect(() => {
    if (isTasksActive) {
      setTasksMenuOpen(true);
    }
  }, [location.pathname, isTasksActive]);

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: 'Keluar dari Sistem?',
      text: 'Anda harus login kembali untuk mengakses aplikasi.',
      icon: 'question',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    });
    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Manajemen Tugas', 
      icon: CheckSquare,
      isDropdown: true,
      children: [
        { name: 'Semua Tugas', path: '/tasks', icon: CheckSquare },
        { name: 'My Tasks', path: '/my-tasks', icon: UserCheck }
      ]
    },
    { name: 'Catatan & Dokumen', path: '/notes', icon: FileText },
    { 
      name: isConsultant ? 'Upload Timesheet' : 'Timesheet Kerja', 
      path: '/timesheets', 
      icon: Clock 
    },
    { 
      name: 'Presensi Kehadiran', 
      path: '/attendance', 
      icon: CalendarCheck,
      hide: isConsultant // Attendance is primarily for internal members
    },
    { name: 'Tiket & Caretaker', path: '/tickets', icon: LifeBuoy },
    { name: 'Laporan & Analitik', path: '/reports', icon: BarChart3 },
    { 
      name: 'Penerimaan Anggota', 
      path: '/members', 
      icon: Users, 
      badge: 'Admin',
      hide: !isManager 
    },
    { 
      name: 'Master Data', 
      path: '/master-data', 
      icon: Database, 
      badge: 'Admin',
      hide: !isManager 
    },
    { 
      name: 'Jejak Audit Trail', 
      path: '/audit-trail', 
      icon: History, 
      badge: 'Log',
      hide: !isManager 
    },
    { 
      name: 'Konfigurasi Sistem', 
      path: '/settings', 
      icon: Settings, 
      badge: 'Admin',
      hide: !isAdmin 
    },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      backdropFilter: 'var(--glass-blur)',
      padding: '24px 16px',
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          color: '#ffffff'
        }}>
          <FolderKanban size={22} />
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            ProjectHub
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Enterprise Suite
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.filter(item => !item.hide).map((item) => {
          const Icon = item.icon;

          if (item.isDropdown) {
            return (
              <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setTasksMenuOpen(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isTasksActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    color: isTasksActive ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    fontWeight: isTasksActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon size={17} color={isTasksActive ? 'var(--primary)' : 'currentColor'} />
                    <span>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: isTasksActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {tasksMenuOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </div>
                </button>

                {tasksMenuOpen && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingLeft: 18,
                    marginLeft: 12,
                    borderLeft: '1.5px solid var(--border-color)',
                    marginTop: 2,
                    marginBottom: 4
                  }}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                            boxShadow: isActive ? '0 3px 10px rgba(99, 102, 241, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                          })}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <ChildIcon size={15} />
                            <span>{child.name}</span>
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={17} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="badge badge-purple" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        paddingTop: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {/* Clickable user profile button */}
        <Link
          to="/profile"
          title="Klik untuk ubah foto & profil Anda"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            background: 'var(--bg-card-solid)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            textDecoration: 'none',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            flexShrink: 0,
          }}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.fullName?.charAt(0) || 'U'
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
              {user?.fullName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className={`badge ${user?.employmentType === 'Consultant' ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                {user?.role}
              </span>
            </div>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', fontSize: '0.8rem' }}
        >
          <LogOut size={15} />
          <span>Keluar Akun</span>
        </button>
      </div>
    </aside>
  );
}
