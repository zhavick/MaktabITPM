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
  RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast, confirmDialog, errorAlert } from '../utils/swal';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newTask, setNewTask] = useState({
    projectId: null,
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    assigneeId: null,
    dueDate: '',
    estimatedHours: 8,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, membersRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects'),
        api.get('/members')
      ]);
      setTasks(tasksRes.data.data || []);
      setProjects(projectsRes.data.data || []);
      setMembers(membersRes.data.data || []);
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

  const columns = [
    { id: 'Todo', title: 'To Do', color: '#94a3b8' },
    { id: 'InProgress', title: 'In Progress', color: '#6366f1' },
    { id: 'InReview', title: 'In Review', color: '#f59e0b' },
    { id: 'Done', title: 'Done', color: '#10b981' },
  ];

  const filteredTasks = selectedProjectId 
    ? tasks.filter(t => t.projectId === selectedProjectId)
    : tasks;

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
    badge: p.code
  }));

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
          <span>Filter Proyek:</span>
        </div>
        <div style={{ width: 280 }}>
          <Select2
            options={[{ value: null, label: 'Semua Proyek' }, ...projectOptions]}
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            placeholder="Pilih proyek..."
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
                    <div key={task.id} className="kanban-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                          {task.projectCode}
                        </span>
                        <span className={`badge ${priorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                        {task.description}
                      </p>

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
                    <label className="form-label">Prioritas</label>
                    <Select2
                      options={[
                        { value: 'Low', label: 'Low', badge: 'Rendah' },
                        { value: 'Medium', label: 'Medium', badge: 'Normal' },
                        { value: 'High', label: 'High', badge: 'Tinggi' },
                        { value: 'Urgent', label: 'Urgent', badge: 'Mendesak' },
                      ]}
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
    </div>
  );
}
