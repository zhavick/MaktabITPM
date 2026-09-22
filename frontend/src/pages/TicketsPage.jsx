import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  UserCheck, 
  ShieldAlert, 
  Search, 
  Filter,
  ArrowRight,
  Send,
  User,
  Folder
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { showToast, confirmDialog, errorAlert, successAlert } from '../utils/swal';

export default function TicketsPage() {
  const { user, isCaretaker } = useAuth();
  const { syncTick, lastEvent } = useSync();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, open_pool, my_assigned
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterProject, setFilterProject] = useState(null);
  const [search, setSearch] = useState('');

  // Master Data state
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterPriorities, setMasterPriorities] = useState([]);

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    projectId: null,
    title: '',
    description: '',
    category: '',
    severity: 'Medium',
    attachmentUrl: ''
  });

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [assigneeSelect, setAssigneeSelect] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time automatic background sync when tickets are updated by other users
  useEffect(() => {
    if (syncTick > 0 && lastEvent) {
      if (lastEvent.type?.startsWith('TICKET_') || lastEvent.type === 'TicketUpdated' || lastEvent.type === 'TicketCreated') {
        api.get('/tickets').then((res) => {
          if (res.data && res.data.data) {
            setTickets(res.data.data);
          }
        }).catch(() => {});
      }
    }
  }, [syncTick]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketRes, projRes, careRes, masterRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/projects'),
        api.get('/members/caretakers'),
        api.get('/master-data?isActive=true')
      ]);
      setTickets(ticketRes.data.data || []);
      setProjects(projRes.data.data || []);
      setCaretakers(careRes.data.data || []);

      const masterItems = masterRes.data.data || [];
      setMasterCategories(masterItems.filter(i => i.type === 'Category'));
      setMasterPriorities(masterItems.filter(i => i.type === 'Priority'));

      if (projRes.data.data?.length > 0 && !newTicket.projectId) {
        setNewTicket(prev => ({ ...prev, projectId: projRes.data.data[0].id }));
      }
    } catch {
      showToast('Gagal memuat daftar tiket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.projectId) {
      errorAlert('Pilih Proyek', 'Silakan pilih proyek terkait permasalahan.');
      return;
    }
    try {
      const res = await api.post('/tickets', newTicket);
      if (res.data.success) {
        await successAlert('Tiket Berhasil Dibuat!', res.data.message);
        setShowCreateModal(false);
        fetchData();
        setNewTicket({
          projectId: projects[0]?.id || null,
          title: '',
          description: '',
          category: '',
          severity: 'Medium',
          attachmentUrl: ''
        });
      }
    } catch (err) {
      errorAlert('Gagal', err.response?.data?.message || 'Gagal melaporkan tiket.');
    }
  };

  const handleClaimTicket = async (ticketId) => {
    const confirmed = await confirmDialog({
      title: 'Klaim Tiket Permasalahan?',
      text: 'Anda akan ditetapkan sebagai Caretaker penanggung jawab tiket ini.',
      icon: 'question',
      confirmButtonText: 'Ya, Klaim Tiket Ini',
      confirmButtonColor: '#6366f1'
    });
    if (confirmed) {
      try {
        const res = await api.post(`/tickets/${ticketId}/assign`, {});
        if (res.data.success) {
          showToast(res.data.message);
          fetchData();
          if (selectedTicket?.id === ticketId) {
            refreshSelectedTicket(ticketId);
          }
        }
      } catch {
        errorAlert('Gagal', 'Terjadi kesalahan saat mengklaim tiket.');
      }
    }
  };

  const handleAssignToCaretaker = async (ticketId, caretakerId) => {
    try {
      const res = await api.post(`/tickets/${ticketId}/assign`, {
        caretakerUserId: caretakerId
      });
      if (res.data.success) {
        showToast(res.data.message);
        fetchData();
        refreshSelectedTicket(ticketId);
      }
    } catch {
      errorAlert('Gagal', 'Gagal menugaskan tiket ke caretaker.');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    let resolutionNotes = '';
    if (newStatus === 'Resolved' || newStatus === 'Closed') {
      const promptResult = window.prompt('Masukkan ringkasan solusi perbaikan masalah:');
      if (promptResult === null) return; // cancelled
      resolutionNotes = promptResult;
    }

    try {
      const res = await api.put(`/tickets/${ticketId}/status`, {
        status: newStatus,
        resolutionNotes
      });
      if (res.data.success) {
        showToast(res.data.message);
        fetchData();
        refreshSelectedTicket(ticketId);
      }
    } catch {
      errorAlert('Gagal', 'Gagal memperbarui status tiket.');
    }
  };

  const handleAddComment = async (ticketId) => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/tickets/${ticketId}/comments`, {
        comment: newComment.trim()
      });
      if (res.data.success) {
        setNewComment('');
        refreshSelectedTicket(ticketId);
      }
    } catch {
      showToast('Gagal mengirim komentar', 'error');
    }
  };

  const refreshSelectedTicket = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(res.data.data);
    } catch {
      // ignore
    }
  };

  const openTicketDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setAssigneeSelect(ticket.assignedCaretakerId);
    refreshSelectedTicket(ticket.id);
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'open_pool' && t.assignedCaretakerId !== null) return false;
    if (activeTab === 'my_assigned' && t.assignedCaretakerId !== user?.id) return false;
    if (filterSeverity !== 'All' && t.severity !== filterSeverity) return false;
    if (filterCategory !== 'All' && t.category !== filterCategory) return false;
    if (filterProject && t.projectId !== filterProject) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.ticketNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
    badge: p.code
  }));

  const categoryOptions = [
    { value: '', label: 'Tanpa Kategori' },
    ...masterCategories.map(c => ({
      value: c.name,
      label: c.name,
      badge: c.code,
      color: c.badgeColor
    }))
  ];

  const severityOptions = masterPriorities.length > 0
    ? masterPriorities.map(p => ({
        value: p.name,
        label: `${p.name} - ${p.description || 'Prioritas'}`,
        badge: p.code,
        color: p.badgeColor
      }))
    : [
        { value: 'Low', label: 'Low (Minor, tidak menghambat operasional)' },
        { value: 'Medium', label: 'Medium (Kendala fungsional non-kritis)' },
        { value: 'High', label: 'High (Menghambat deliverable utama proyek)' },
        { value: 'Critical', label: 'Critical (Sistem down / error fatal database)' },
      ];

  const caretakerOptions = caretakers.map(c => ({
    value: c.id,
    label: c.fullName,
    subLabel: `${c.role} • ${c.email}`,
    avatar: c.fullName
  }));

  const severityBadgeClass = (sev) => {
    switch (sev) {
      case 'Critical': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-primary';
      case 'Low': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'Open': return 'badge-danger';
      case 'InProgress': return 'badge-warning';
      case 'InReview': return 'badge-purple';
      case 'Resolved': return 'badge-success';
      case 'Closed': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Manajemen Tiket Kendala & Caretaker Pool</h1>
          <p>Pelaporan insiden / bug aplikasi yang langsung ditangani oleh pemangku dan tim caretaker proyek.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          <span>Laporkan Masalah Baru</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          className="btn"
          onClick={() => setActiveTab('all')}
          style={{
            background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'all' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <LifeBuoy size={16} />
          <span>Semua Tiket ({tickets.length})</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('open_pool')}
          style={{
            background: activeTab === 'open_pool' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'open_pool' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'open_pool' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <AlertTriangle size={16} />
          <span>Antrean Terbuka (Open Pool)</span>
          {tickets.filter(t => !t.assignedCaretakerId).length > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: 6 }}>
              {tickets.filter(t => !t.assignedCaretakerId).length}
            </span>
          )}
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('my_assigned')}
          style={{
            background: activeTab === 'my_assigned' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'my_assigned' ? '#fff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'my_assigned' ? 700 : 500,
            borderRadius: 'var(--radius-md)'
          }}
        >
          <UserCheck size={16} />
          <span>Ditugaskan ke Saya ({tickets.filter(t => t.assignedCaretakerId === user?.id).length})</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '12px 18px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Filter size={16} />
          <span>Filter:</span>
        </div>

        <div style={{ width: 200 }}>
          <Select2
            options={[{ value: null, label: 'Semua Proyek' }, ...projectOptions]}
            value={filterProject}
            onChange={(val) => setFilterProject(val)}
            placeholder="Proyek..."
          />
        </div>

        <div style={{ width: 180 }}>
          <Select2
            options={[{ value: 'All', label: 'Semua Kategori' }, ...categoryOptions.filter(c => c.value)]}
            value={filterCategory}
            onChange={(val) => setFilterCategory(val)}
            placeholder="Kategori..."
          />
        </div>

        <div style={{ width: 190 }}>
          <Select2
            options={[
              { value: 'All', label: 'Semua Keparahan' },
              { value: 'Critical', label: 'Critical (Kritis)' },
              { value: 'High', label: 'High (Tinggi)' },
              { value: 'Medium', label: 'Medium (Sedang)' },
              { value: 'Low', label: 'Low (Rendah)' },
            ]}
            value={filterSeverity}
            onChange={(val) => setFilterSeverity(val)}
          />
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Cari nomor atau judul tiket..."
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>No. Tiket</th>
                <th>Judul Permasalahan</th>
                <th>Proyek</th>
                <th>Keparahan</th>
                <th>Status</th>
                <th>Pelapor</th>
                <th>Caretaker Penanggung Jawab</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Tidak ada tiket yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {t.ticketNumber}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</span>
                        {t.category && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                            {t.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {t.description}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{t.projectCode}</span>
                    </td>
                    <td>
                      <span className={`badge ${severityBadgeClass(t.severity)}`}>
                        {t.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{t.reportedByUserName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.reportedByUserRole}</div>
                    </td>
                    <td>
                      {t.assignedCaretakerName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} style={{ color: 'var(--success)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.assignedCaretakerName}</span>
                        </div>
                      ) : (
                        <span className="badge badge-warning">Antrean Terbuka</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {!t.assignedCaretakerId && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleClaimTicket(t.id)}
                            title="Klaim tiket ke diri saya"
                          >
                            <span>Klaim</span>
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openTicketDetail(t)}
                        >
                          <MessageSquare size={14} />
                          <span>Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-primary" style={{ fontFamily: 'monospace', marginBottom: 4 }}>
                  {selectedTicket.ticketNumber}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedTicket.title}</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Meta information row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20, padding: 14, background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proyek:</div>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedTicket.projectName}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kategori:</div>
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                    {selectedTicket.category || 'Umum'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keparahan:</div>
                  <span className={`badge ${severityBadgeClass(selectedTicket.severity)}`}>{selectedTicket.severity}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</div>
                  <span className={`badge ${statusBadgeClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pelapor:</div>
                  <span style={{ fontSize: '0.85rem' }}>{selectedTicket.reportedByUserName}</span>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Uraian Kendala / Masalah:
                </div>
                <div style={{ padding: 14, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {selectedTicket.description}
                </div>
              </div>

              {/* Caretaker Assignment Controls */}
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck size={16} style={{ color: 'var(--primary)' }} />
                    <span>Penugasan Caretaker:</span>
                  </div>
                  {!selectedTicket.assignedCaretakerId && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleClaimTicket(selectedTicket.id)}>
                      Klaim Tiket Ini
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <Select2
                      options={caretakerOptions}
                      value={assigneeSelect}
                      onChange={(val) => setAssigneeSelect(val)}
                      placeholder="Pilih anggota tim Caretaker..."
                    />
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAssignToCaretaker(selectedTicket.id, assigneeSelect)}
                  >
                    Tugaskan
                  </button>
                </div>
              </div>

              {/* Status Progression Workflow */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Perbarui Status Alur Kerja:
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Open', 'InProgress', 'InReview', 'Resolved', 'Closed'].map(st => (
                    <button
                      key={st}
                      className={`btn btn-sm ${selectedTicket.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange(selectedTicket.id, st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Note if resolved */}
              {selectedTicket.resolutionNotes && (
                <div style={{ marginBottom: 20, padding: 14, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem', marginBottom: 4 }}>
                    ✓ Ringkasan Solusi Masalah:
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{selectedTicket.resolutionNotes}</div>
                </div>
              )}

              {/* Discussion / Comments Timeline */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Histori Diskusi & Aktivitas ({selectedTicket.comments?.length || 0}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                  {selectedTicket.comments?.map(c => (
                    <div key={c.id} style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{c.userName} ({c.userRole})</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>{c.comment}</div>
                    </div>
                  ))}
                </div>

                {/* Add Comment Input */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tulis pesan atau update investigasi..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedTicket.id)}
                  />
                  <button className="btn btn-primary" onClick={() => handleAddComment(selectedTicket.id)}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LifeBuoy size={20} style={{ color: 'var(--primary)' }} />
                <span>Laporkan Masalah / Kendala Sistem</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Proyek Terkait</label>
                  <Select2
                    options={projectOptions}
                    value={newTicket.projectId}
                    onChange={(val) => setNewTicket({ ...newTicket, projectId: val })}
                    placeholder="Pilih proyek yang mengalami kendala..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Masalah / Gejala Kendala</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Terjadi Galat 500 saat generate invoice PPN"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kategori Masalah (Master Data)</label>
                    <Select2
                      options={categoryOptions}
                      value={newTicket.category}
                      onChange={(val) => setNewTicket({ ...newTicket, category: val })}
                      placeholder="Pilih kategori kendala..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tingkat Keparahan (Severity)</label>
                    <Select2
                      options={severityOptions}
                      value={newTicket.severity}
                      onChange={(val) => setNewTicket({ ...newTicket, severity: val })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kronologi & Deskripsi Detail</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: 120 }}
                    placeholder="Jelaskan langkah reproduksi masalah, pesan error yang muncul, dan dampak terhadap pekerjaan..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card-solid)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  Tiket akan masuk ke <strong>Antrean Terbuka (Open Pool)</strong> agar segera di-review dan diklaim oleh Caretaker pemelihara proyek terkait.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <LifeBuoy size={16} />
                  <span>Kirim Laporan Tiket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
