import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Filter, 
  MoreVertical,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  AlertCircle,
  Download
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast, confirmDialog, errorAlert } from '../utils/swal';
import { useSync } from '../context/SyncContext';

export default function TasksPage() {
  const { syncTick, lastEvent } = useSync();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterPriorities, setMasterPriorities] = useState([]);
  const [masterMilestones, setMasterMilestones] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProjectId, setImportProjectId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [newTask, setNewTask] = useState({
    projectId: null,
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    category: '',
    milestone: '',
    assigneeId: null,
    dueDate: '',
    estimatedHours: 8,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Real-time automatic background synchronization across multi-user sessions
  useEffect(() => {
    if (syncTick > 0 && lastEvent) {
      if (lastEvent.type?.startsWith('TASK_') || lastEvent.type === 'TaskUpdated' || lastEvent.type === 'TaskCreated') {
        api.get('/tasks').then((res) => {
          if (res.data && res.data.data) {
            setTasks(res.data.data);
          }
        }).catch(() => {});
      }
    }
  }, [syncTick]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, membersRes, masterRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects'),
        api.get('/members'),
        api.get('/master-data?isActive=true')
      ]);
      setTasks(tasksRes.data.data || []);
      setProjects(projectsRes.data.data || []);
      setMembers(membersRes.data.data || []);

      const masterItems = masterRes.data.data || [];
      setMasterCategories(masterItems.filter(i => i.type === 'Category'));
      setMasterPriorities(masterItems.filter(i => i.type === 'Priority'));
      setMasterMilestones(masterItems.filter(i => i.type === 'Milestone'));

      if (projectsRes.data.data?.length > 0 && !newTask.projectId) {
        setNewTask(prev => ({ ...prev, projectId: projectsRes.data.data[0].id }));
      }
    } catch {
      showToast('Gagal memuat data tugas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        showToast(`Status tugas diubah ke ${newStatus}!`);
      }
    } catch {
      showToast('Gagal mengubah status tugas', 'error');
    }
  };

  const handleDeleteTask = async (taskId, title) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Tugas?',
      text: `Tugas "${title}" akan dihapus secara permanen.`,
      icon: 'warning',
      confirmButtonText: 'Hapus',
      confirmButtonColor: '#ef4444'
    });
    if (confirmed) {
      try {
        await api.delete(`/tasks/${taskId}`);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        showToast('Tugas berhasil dihapus.');
      } catch {
        showToast('Gagal menghapus tugas', 'error');
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.projectId) {
      errorAlert('Pilih Proyek', 'Silakan pilih proyek tujuan pembuatan tugas.');
      return;
    }
    try {
      const res = await api.post('/tasks', newTask);
      if (res.data.success) {
        showToast('Tugas baru berhasil dibuat!');
        setShowModal(false);
        fetchInitialData();
        setNewTask({
          projectId: projects[0]?.id || null,
          title: '',
          description: '',
          status: 'Todo',
          priority: 'Medium',
          assigneeId: null,
          dueDate: '',
          estimatedHours: 8,
        });
      }
    } catch (err) {
      errorAlert('Gagal', err.response?.data?.message || 'Gagal menyimpan tugas.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/tasks/template-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_Tugas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Template Excel tugas berhasil diunduh.', 'success');
    } catch {
      errorAlert('Gagal Mengunduh', 'Tidak dapat mengunduh berkas template tugas.');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      errorAlert('Pilih Berkas', 'Silakan unggah berkas Excel (.xlsx).');
      return;
    }

    const formData = new FormData();
    if (importProjectId) {
      formData.append('ProjectId', importProjectId);
    }
    formData.append('File', importFile);

    setImporting(true);
    try {
      const res = await api.post('/tasks/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowImportModal(false);
        setImportFile(null);
        fetchInitialData();
      }
    } catch (err) {
      errorAlert('Gagal Mengimpor', err.response?.data?.message || 'Terjadi kesalahan saat memproses berkas Excel.');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { id: 'Todo', title: 'To Do', color: '#94a3b8' },
    { id: 'InProgress', title: 'In Progress', color: '#6366f1' },
    { id: 'InReview', title: 'In Review', color: '#f59e0b' },
    { id: 'Done', title: 'Done', color: '#10b981' },
  ];

  const filteredTasks = tasks.filter(t => {
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (selectedCategory && t.category !== selectedCategory) return false;
    return true;
  });

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
    badge: p.code,
    color: p.color
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

  const milestoneOptions = [
    { value: '', label: 'Tanpa Milestone' },
    ...masterMilestones.map(m => ({
      value: m.name,
      label: m.name,
      badge: `#${m.sortOrder}`,
      color: m.badgeColor
    }))
  ];

  const priorityOptions = masterPriorities.length > 0
    ? masterPriorities.map(p => ({
        value: p.name,
        label: p.name,
        badge: `#${p.sortOrder}`,
        color: p.badgeColor
      }))
    : [
        { value: 'Low', label: 'Low', badge: 'Rendah' },
        { value: 'Medium', label: 'Medium', badge: 'Normal' },
        { value: 'High', label: 'High', badge: 'Tinggi' },
        { value: 'Urgent', label: 'Urgent', badge: 'Mendesak' },
      ];

  const memberOptions = members.map(m => ({
    value: m.id,
    label: m.fullName,
    subLabel: `${m.role} • ${m.employmentType}`,
    avatar: m.fullName
  }));

  const priorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-primary';
      case 'Low': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Manajemen Tugas (Kanban Board)</h1>
          <p>Lacak progres pekerjaan tim internal dan konsultan secara visual dan terstruktur.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={fetchInitialData}>
            <RefreshCw size={16} />
            <span>Segarkan</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setImportProjectId(selectedProjectId || (projects[0]?.id || null));
              setImportFile(null);
              setShowImportModal(true);
            }}
            style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              color: '#10b981', 
              borderColor: 'rgba(16, 185, 129, 0.3)' 
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Import Excel</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Buat Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '12px 18px',
        background: 'var(--bg-card)',
        backdropFilter: 'var(--glass-blur)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filter:</span>
        </div>
        <div style={{ width: 240 }}>
          <Select2
            options={[{ value: null, label: 'Semua Proyek' }, ...projectOptions]}
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            placeholder="Pilih proyek..."
          />
        </div>
        <div style={{ width: 220 }}>
          <Select2
            options={[{ value: null, label: 'Semua Kategori' }, ...categoryOptions.filter(c => c.value)]}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            placeholder="Pilih kategori..."
          />
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Menampilkan {filteredTasks.length} tugas aktif
        </span>
      </div>

      {/* Kanban Columns */}
      <div className="kanban-board">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-header">
                <div className="kanban-title" style={{ color: col.color }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }}></span>
                  <span>{col.title}</span>
                </div>
                <span className="kanban-count">{colTasks.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {colTasks.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Tidak ada tugas
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="kanban-card"
                      style={{
                        borderLeft: `4px solid ${task.projectColor || '#6366f1'}`,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: `${task.projectColor || '#6366f1'}18`,
                            color: task.projectColor || '#6366f1',
                            border: `1px solid ${task.projectColor || '#6366f1'}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={`Proyek: ${task.projectName || task.projectCode}`}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: task.projectColor || '#6366f1' }}></span>
                          {task.projectCode}
                        </span>
                        <span className={`badge ${priorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                        {task.description}
                      </p>

                      {(task.category || task.milestone) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {task.category && (
                            <span 
                              style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 700, 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(99, 102, 241, 0.12)', 
                                color: 'var(--primary)',
                                border: '1px solid rgba(99, 102, 241, 0.25)' 
                              }}
                            >
                              {task.category}
                            </span>
                          )}
                          {task.milestone && (
                            <span 
                              style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 600, 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(16, 185, 129, 0.12)', 
                                color: 'var(--success)',
                                border: '1px solid rgba(16, 185, 129, 0.25)' 
                              }}
                            >
                              🚩 {task.milestone}
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {task.assigneeName ? task.assigneeName.charAt(0) : '?'}
                          </div>
                          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.assigneeName || 'Belum ditugaskan'}
                          </span>
                        </div>
                        {task.estimatedHours > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} />
                            <span>{task.estimatedHours}h</span>
                          </div>
                        )}
                      </div>

                      {/* Status Next Action Buttons */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'flex-end' }}>
                        {col.id !== 'Todo' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            onClick={() => handleStatusChange(task.id, col.id === 'Done' ? 'InReview' : col.id === 'InReview' ? 'InProgress' : 'Todo')}
                            title="Mundurkan status"
                          >
                            ◀
                          </button>
                        )}
                        {col.id !== 'Done' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            onClick={() => handleStatusChange(task.id, col.id === 'Todo' ? 'InProgress' : col.id === 'InProgress' ? 'InReview' : 'Done')}
                            title="Majukan status"
                          >
                            <span>Lanjut</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={20} style={{ color: 'var(--primary)' }} />
                <span>Buat Item Tugas Baru</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Proyek Tujuan</label>
                  <Select2
                    options={projectOptions}
                    value={newTask.projectId}
                    onChange={(val) => setNewTask({ ...newTask, projectId: val })}
                    placeholder="Pilih proyek..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Tugas</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Optimasi Query Database MySQL"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi & Rincian Pekerjaan</label>
                  <textarea
                    className="form-control"
                    placeholder="Jelaskan deliverable dan batasan teknis..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Prioritas (Master Data)</label>
                    <Select2
                      options={priorityOptions}
                      value={newTask.priority}
                      onChange={(val) => setNewTask({ ...newTask, priority: val })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Awal</label>
                    <Select2
                      options={columns.map(c => ({ value: c.id, label: c.title }))}
                      value={newTask.status}
                      onChange={(val) => setNewTask({ ...newTask, status: val })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kategori Pekerjaan (Master Data)</label>
                    <Select2
                      options={categoryOptions}
                      value={newTask.category}
                      onChange={(val) => setNewTask({ ...newTask, category: val })}
                      placeholder="Pilih kategori..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Milestone SDLC (Master Data)</label>
                    <Select2
                      options={milestoneOptions}
                      value={newTask.milestone}
                      onChange={(val) => setNewTask({ ...newTask, milestone: val })}
                      placeholder="Pilih milestone..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Penerima Tugas (Assignee)</label>
                  <Select2
                    options={memberOptions}
                    value={newTask.assigneeId}
                    onChange={(val) => setNewTask({ ...newTask, assigneeId: val })}
                    placeholder="Pilih anggota tim atau konsultan..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Target Selesai (Due Date)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimasi Jam Kerja</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={newTask.estimatedHours}
                      onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>Tambahkan ke Papan Kanban</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Tasks Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={22} style={{ color: '#10b981' }} />
                <span>Import Tugas dari Berkas Excel (.xlsx)</span>
              </h3>
              <button className="btn btn-secondary btn-sm" disabled={importing} onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body">
                {/* Column 2 Auto-Detection Banner */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      B
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Deteksi Nama Proyek Otomatis (Kolom ke-2)
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Nama proyek diambil langsung dari <strong>Kolom ke-2 (Kolom B)</strong> file Excel. Tidak perlu memilih proyek secara manual.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn btn-secondary btn-sm"
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.78rem',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.06)'
                    }}
                    title="Unduh berkas format Excel resmi"
                  >
                    <Download size={14} />
                    <span>Template Excel</span>
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Berkas Excel (.xlsx)</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                          setImportFile(file);
                        } else {
                          errorAlert('Format Tidak Sesuai', 'Hanya berkas format .xlsx atau .xls yang diperbolehkan.');
                        }
                      }
                    }}
                    style={{
                      border: isDragging ? '2px dashed #10b981' : '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: isDragging ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => document.getElementById('excel-task-input').click()}
                  >
                    <input
                      id="excel-task-input"
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                        }
                      }}
                    />
                    <UploadCloud size={36} style={{ color: importFile ? '#10b981' : 'var(--text-muted)', marginBottom: 8 }} />
                    {importFile ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.95rem' }}>{importFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {(importFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          Tarik berkas ke sini atau <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Pilih File</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Mendukung format .xlsx (Excel Worksheets)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Information Callout */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}>
                  <AlertCircle size={18} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Struktur Kolom Excel:</strong>
                    <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                      1. Kode Task &bull; <strong style={{ color: '#10b981' }}>2. Nama Project</strong> &bull; 3. Nama Task &bull; 4. Kategori &bull; 5. PIC &bull; 6. Prioritas &bull; 7. Status &bull; 8. Milestone SDLC &bull; 9. Tanggal Berakhir &bull; 10. Kendala &bull; 11. Solusi
                    </div>
                    <div style={{ marginTop: 6, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      💡 Jika nama proyek pada Kolom ke-2 belum terdaftar di sistem, proyek baru akan otomatis dibuatkan.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={importing} onClick={() => setShowImportModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={importing || !importFile} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  {importing ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" />
                      <span>Memproses Impor...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Mulai Impor Tugas</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
