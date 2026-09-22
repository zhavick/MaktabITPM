import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Download,
  LayoutGrid,
  Table,
  X,
  Trash2,
  FileText,
  ChevronDown,
  Edit3,
  Flag,
  UserCheck,
  MessageSquare,
  Send,
  History,
  AlertTriangle,
  Check,
  Ban,
  GripVertical
} from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast, confirmDialog, promptDialog, errorAlert } from '../utils/swal';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);
  if (diffInSec < 60) return 'Baru saja';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} menit lalu`;
  const diffInHour = Math.floor(diffInMin / 60);
  if (diffInHour < 24) return `${diffInHour} jam lalu`;
  const diffInDay = Math.floor(diffInHour / 24);
  if (diffInDay < 7) return `${diffInDay} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export default function TasksPage({ onlyMyTasks = false }) {
  const location = useLocation();
  const { user } = useAuth();
  const isMyTasks = onlyMyTasks || location.pathname === '/my-tasks';
  const tasksEndpoint = isMyTasks ? '/tasks/my-tasks' : '/tasks';
  const { syncTick, lastEvent } = useSync();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterPriorities, setMasterPriorities] = useState([]);
  const [masterMilestones, setMasterMilestones] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterPendingDeletion, setFilterPendingDeletion] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'grid'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProjectId, setImportProjectId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalTab, setModalTab] = useState('details'); // 'details' | 'comments' | 'activities'
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

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
  }, [isMyTasks]);

  // Real-time automatic background synchronization across multi-user sessions
  useEffect(() => {
    if (syncTick > 0 && lastEvent) {
      if (lastEvent.type?.startsWith('TASK_') || lastEvent.type === 'TaskUpdated' || lastEvent.type === 'TaskCreated') {
        api.get(tasksEndpoint).then((res) => {
          if (res.data && res.data.data) {
            setTasks(res.data.data);
          }
        }).catch(() => {});
        if (editingTask && (lastEvent.taskId === editingTask.id || !lastEvent.taskId)) {
          fetchTaskActivities(editingTask.id);
        }
      } else if (lastEvent.type === 'TaskCommentAdded' || lastEvent.type === 'TaskCommentDeleted') {
        if (editingTask && lastEvent.taskId === editingTask.id) {
          fetchTaskComments(editingTask.id);
          fetchTaskActivities(editingTask.id);
        }
        api.get(tasksEndpoint).then((res) => {
          if (res.data && res.data.data) {
            setTasks(res.data.data);
          }
        }).catch(() => {});
      }
    }
  }, [syncTick, tasksEndpoint, editingTask]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, membersRes, masterRes] = await Promise.all([
        api.get(tasksEndpoint),
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
        setNewTask(prev => ({ 
          ...prev, 
          projectId: projectsRes.data.data[0].id,
          assigneeId: (isMyTasks && user?.id) ? user.id : prev.assigneeId
        }));
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

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColId(null);
    setIsDragging(false);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverColId === colId) {
        setDragOverColId(null);
      }
    }
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    setDragOverColId(null);
    setIsDragging(false);
    const taskIdStr = e.dataTransfer.getData('text/plain') || String(draggedTaskId || '');
    setDraggedTaskId(null);
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === colId) return;

    // Optimistic UI update for snappy response
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: colId } : t));

    // Persist to backend API
    handleStatusChange(taskId, colId);
  };

  const handleDeleteTask = async (task) => {
    // If user has authority to delete directly (Admin, Project Manager, or Project Owner)
    if (task.canApproveDeletion) {
      const confirmed = await confirmDialog({
        title: 'Hapus Tugas Permanen?',
        text: `Tugas "${task.title}" akan dihapus permanen beserta seluruh riwayat aktivitas dan diskusinya.`,
        icon: 'warning',
        confirmButtonText: 'Ya, Hapus Permanen',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ef4444'
      });
      if (confirmed) {
        try {
          const res = await api.delete(`/tasks/${task.id}`);
          if (res.data.success) {
            setTasks(prev => prev.filter(t => t.id !== task.id));
            showToast('Tugas berhasil dihapus permanen.');
            if (editingTask?.id === task.id) {
              setShowEditModal(false);
              setEditingTask(null);
            }
          }
        } catch (err) {
          errorAlert('Gagal Menghapus', err.response?.data?.message || 'Gagal menghapus tugas.');
        }
      }
    } else {
      // Member requesting deletion with reason
      const promptRes = await promptDialog({
        title: 'Ajukan Penghapusan Tugas',
        text: 'Sebagai anggota tim, penghapusan tugas memerlukan persetujuan dari Administrator atau Project Manager/Owner. Silakan cantumkan alasan penghapusan:',
        inputPlaceholder: 'Contoh: Tugas ini duplikat dengan tugas lain, ruang lingkup dibatalkan klien, dll...',
        confirmButtonText: 'Kirim Pengajuan Hapus',
        confirmButtonColor: '#f59e0b'
      });

      if (promptRes.isConfirmed && promptRes.value) {
        try {
          const res = await api.post(`/tasks/${task.id}/request-deletion`, { reason: promptRes.value });
          if (res.data.success) {
            showToast(res.data.message || 'Permohonan penghapusan telah diajukan.');
            setTasks(prev => prev.map(t => t.id === task.id ? { 
              ...t, 
              isPendingDeletion: true, 
              deletionReason: promptRes.value,
              deletionRequestedByName: user?.fullName || 'Saya',
              deletionRequestedById: user?.id,
              deletionRequestedAt: new Date().toISOString()
            } : t));
            if (editingTask?.id === task.id) {
              setEditingTask(prev => ({
                ...prev,
                isPendingDeletion: true,
                deletionReason: promptRes.value,
                deletionRequestedByName: user?.fullName || 'Saya',
                deletionRequestedById: user?.id,
                deletionRequestedAt: new Date().toISOString()
              }));
              fetchTaskActivities(task.id);
            }
          }
        } catch (err) {
          errorAlert('Gagal Mengajukan', err.response?.data?.message || 'Gagal mengajukan permohonan hapus tugas.');
        }
      }
    }
  };

  const handleApproveDeletion = async (task) => {
    const confirmed = await confirmDialog({
      title: 'Setujui Penghapusan Tugas?',
      text: `Tugas "${task.title}" yang diajukan oleh ${task.deletionRequestedByName || 'anggota tim'} akan dihapus secara permanen.`,
      icon: 'warning',
      confirmButtonText: 'Ya, Setujui & Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    });
    if (confirmed) {
      try {
        const res = await api.post(`/tasks/${task.id}/approve-deletion`);
        if (res.data.success) {
          showToast(res.data.message || 'Penghapusan tugas berhasil disetujui.');
          setTasks(prev => prev.filter(t => t.id !== task.id));
          if (editingTask?.id === task.id) {
            setShowEditModal(false);
            setEditingTask(null);
          }
        }
      } catch (err) {
        errorAlert('Gagal Menyetujui', err.response?.data?.message || 'Gagal menyetujui penghapusan tugas.');
      }
    }
  };

  const handleRejectDeletion = async (task) => {
    const promptRes = await promptDialog({
      title: 'Tolak Pengajuan Hapus',
      text: `Masukkan alasan penolakan pengajuan hapus tugas "${task.title}":`,
      inputPlaceholder: 'Contoh: Tugas ini masih dibutuhkan untuk pengujian QA...',
      confirmButtonText: 'Tolak Pengajuan',
      confirmButtonColor: '#64748b'
    });
    if (promptRes.isConfirmed && promptRes.value) {
      try {
        const res = await api.post(`/tasks/${task.id}/reject-deletion`, { reason: promptRes.value });
        if (res.data.success) {
          showToast(res.data.message || 'Pengajuan penghapusan ditolak. Tugas tetap aktif.');
          setTasks(prev => prev.map(t => t.id === task.id ? { 
            ...t, 
            isPendingDeletion: false, 
            deletionReason: null,
            deletionRequestedByName: null,
            deletionRequestedById: null,
            deletionRequestedAt: null
          } : t));
          if (editingTask?.id === task.id) {
            setEditingTask(prev => ({
              ...prev,
              isPendingDeletion: false,
              deletionReason: null,
              deletionRequestedByName: null,
              deletionRequestedById: null,
              deletionRequestedAt: null
            }));
            fetchTaskActivities(task.id);
          }
        }
      } catch (err) {
        errorAlert('Gagal Menolak', err.response?.data?.message || 'Gagal menolak pengajuan penghapusan.');
      }
    }
  };

  const handleCancelDeletionRequest = async (task) => {
    const confirmed = await confirmDialog({
      title: 'Batalkan Pengajuan Hapus?',
      text: `Permohonan penghapusan tugas "${task.title}" akan dibatalkan dan status tugas dikembalikan normal.`,
      icon: 'question',
      confirmButtonText: 'Ya, Batalkan Pengajuan',
      cancelButtonText: 'Kembali',
      confirmButtonColor: '#6366f1'
    });
    if (confirmed) {
      try {
        const res = await api.post(`/tasks/${task.id}/cancel-deletion-request`);
        if (res.data.success) {
          showToast(res.data.message || 'Permohonan penghapusan tugas dibatalkan.');
          setTasks(prev => prev.map(t => t.id === task.id ? { 
            ...t, 
            isPendingDeletion: false, 
            deletionReason: null,
            deletionRequestedByName: null,
            deletionRequestedById: null,
            deletionRequestedAt: null
          } : t));
          if (editingTask?.id === task.id) {
            setEditingTask(prev => ({
              ...prev,
              isPendingDeletion: false,
              deletionReason: null,
              deletionRequestedByName: null,
              deletionRequestedById: null,
              deletionRequestedAt: null
            }));
            fetchTaskActivities(task.id);
          }
        }
      } catch (err) {
        errorAlert('Gagal Membatalkan', err.response?.data?.message || 'Gagal membatalkan pengajuan.');
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
          category: '',
          milestone: '',
          assigneeId: (isMyTasks && user?.id) ? user.id : null,
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

  const handleExport = async (format = 'xlsx') => {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const params = new URLSearchParams();
      if (isMyTasks) params.append('onlyMyTasks', 'true');
      if (selectedProjectId) params.append('projectId', selectedProjectId);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('format', format);

      const response = await api.get(`/tasks/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const mimeType = format === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const filenamePrefix = isMyTasks ? 'Laporan_Tugas_Saya' : 'Laporan_Tugas';
      link.setAttribute('download', `${filenamePrefix}_${dateStr}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast(`Data tugas berhasil diekspor (${format.toUpperCase()})!`, 'success');
    } catch {
      showToast('Gagal mengekspor data tugas', 'error');
    } finally {
      setExporting(false);
    }
  };

  const openEditModal = (task, initialTab = 'details') => {
    setEditingTask({
      id: task.id,
      projectId: task.projectId,
      projectName: task.projectName,
      projectCode: task.projectCode,
      projectColor: task.projectColor,
      title: task.title,
      description: task.description || '',
      status: task.status || 'Todo',
      priority: task.priority || 'Medium',
      category: task.category || '',
      milestone: task.milestone || '',
      assigneeId: task.assigneeId || null,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      estimatedHours: task.estimatedHours || 0,
      createdAt: task.createdAt,
      isPendingDeletion: task.isPendingDeletion || false,
      deletionRequestedById: task.deletionRequestedById || null,
      deletionRequestedByName: task.deletionRequestedByName || null,
      deletionReason: task.deletionReason || null,
      deletionRequestedAt: task.deletionRequestedAt || null,
      canApproveDeletion: task.canApproveDeletion || false
    });
    setModalTab(initialTab);
    setShowEditModal(true);
    fetchTaskComments(task.id);
    fetchTaskActivities(task.id);
  };

  const fetchTaskComments = async (taskId) => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/tasks/${taskId}/comments`);
      if (res.data.success) {
        setComments(res.data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchTaskActivities = async (taskId) => {
    setLoadingActivities(true);
    try {
      const res = await api.get(`/tasks/${taskId}/activities`);
      if (res.data.success) {
        setActivities(res.data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || !editingTask) return;
    try {
      setSubmittingComment(true);
      const res = await api.post(`/tasks/${editingTask.id}/comments`, { comment: newComment.trim() });
      if (res.data.success) {
        setComments(prev => [...prev, res.data.data]);
        setNewComment('');
        showToast('Komentar berhasil dikirim!', 'success');
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, commentCount: (t.commentCount || 0) + 1 } : t));
        fetchTaskActivities(editingTask.id);
      }
    } catch (err) {
      errorAlert('Gagal', err.response?.data?.message || 'Gagal mengirim komentar.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!editingTask) return;
    const confirmed = await confirmDialog({
      title: 'Hapus Komentar?',
      text: 'Komentar yang dihapus tidak dapat dipulihkan kembali.',
      icon: 'warning',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    });
    if (confirmed) {
      try {
        const res = await api.delete(`/tasks/${editingTask.id}/comments/${commentId}`);
        if (res.data.success) {
          setComments(prev => prev.filter(c => c.id !== commentId));
          showToast('Komentar berhasil dihapus.');
          setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, commentCount: Math.max(0, (t.commentCount || 1) - 1) } : t));
        }
      } catch (err) {
        errorAlert('Gagal', err.response?.data?.message || 'Gagal menghapus komentar.');
      }
    }
  };

  const handleSaveEditTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.id) return;
    if (!editingTask.projectId) {
      errorAlert('Pilih Proyek', 'Silakan pilih proyek tujuan.');
      return;
    }
    try {
      setSavingEdit(true);
      const payload = {
        projectId: editingTask.projectId,
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
        category: editingTask.category || null,
        milestone: editingTask.milestone || null,
        assigneeId: editingTask.assigneeId || null,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : null,
        estimatedHours: parseFloat(editingTask.estimatedHours) || 0
      };

      const res = await api.put(`/tasks/${editingTask.id}`, payload);
      if (res.data.success) {
        showToast('Tugas berhasil diperbarui!');
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...res.data.data } : t));
        setShowEditModal(false);
        setEditingTask(null);
      }
    } catch (err) {
      errorAlert('Gagal Memperbarui', err.response?.data?.message || 'Terjadi kesalahan saat memperbarui data tugas.');
    } finally {
      setSavingEdit(false);
    }
  };

  const columns = [
    { id: 'Todo', title: 'To Do', color: '#94a3b8' },
    { id: 'InProgress', title: 'In Progress', color: '#6366f1' },
    { id: 'InReview', title: 'In Review', color: '#f59e0b' },
    { id: 'Done', title: 'Done', color: '#10b981' },
  ];

  const pendingDeletionCount = tasks.filter(t => t.isPendingDeletion).length;

  const filteredTasks = tasks.filter((t) => {
    if (filterPendingDeletion && !t.isPendingDeletion) return false;
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchProject = (t.projectName || t.projectCode)?.toLowerCase().includes(q);
      const matchCategory = t.category?.toLowerCase().includes(q);
      const matchMilestone = t.milestone?.toLowerCase().includes(q);
      const matchAssignee = t.assigneeName?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchStatus = t.status?.toLowerCase().includes(q);
      const matchPriority = t.priority?.toLowerCase().includes(q);
      if (!matchTitle && !matchProject && !matchCategory && !matchMilestone && !matchAssignee && !matchDesc && !matchStatus && !matchPriority) {
        return false;
      }
    }
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMyTasks && <UserCheck size={26} color="var(--primary)" />}
            <span>{isMyTasks ? 'My Tasks (Tugas Saya)' : 'Manajemen Tugas'}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              ({viewMode === 'kanban' ? 'Papan Kanban' : 'Tabel Grid'})
            </span>
          </h1>
          <p>
            {isMyTasks 
              ? 'Daftar tugas yang khusus ditugaskan kepada Anda. Menampilkan data personal tanpa memuat seluruh tugas tim.' 
              : 'Lacak dan kelola progres pekerjaan tim secara visual (Kanban) atau terstruktur (Tabel Grid).'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Kanban vs Grid Table */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 3,
            gap: 2
          }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className="btn btn-sm"
              style={{
                background: viewMode === 'kanban' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'kanban' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 3px)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutGrid size={15} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="btn btn-sm"
              style={{
                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 3px)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Table size={15} />
              <span>Tabel Grid</span>
            </button>
          </div>

          <button className="btn btn-secondary" onClick={fetchInitialData}>
            <RefreshCw size={16} />
            <span>Segarkan</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setImportProjectId(selectedProjectId || null);
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

          {/* Ekspor Data Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowExportMenu(prev => !prev)}
              disabled={exporting}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Ekspor data tugas sesuai filter aktif ke berkas Excel atau CSV"
            >
              {exporting ? (
                <RefreshCw size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Ekspor Data</span>
              <ChevronDown size={14} style={{ transform: showExportMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  onClick={() => setShowExportMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: 230,
                    background: 'var(--bg-card)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 6,
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border-color)', marginBottom: 2 }}>
                    PILIH FORMAT EKSPOR ({filteredTasks.length} TUGAS)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Microsoft Excel (.xlsx)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tabel bergaris, status & total jam</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <FileText size={16} style={{ color: '#0284c7' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Berkas CSV (.csv)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Universal UTF-8 with BOM</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Buat Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar Above Grid / Kanban */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        padding: '12px 18px',
        background: 'var(--bg-card)',
        backdropFilter: 'var(--glass-blur)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          {/* Real-time Search Box Above Grid */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Cari tugas (judul, kode, proyek, PIC, kategori, milestone)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: 36,
                paddingRight: searchQuery ? 32 : 12,
                height: 38,
                fontSize: '0.85rem'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div style={{ width: 220 }}>
            <Select2
              options={[{ value: null, label: 'Semua Proyek' }, ...projectOptions]}
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              placeholder="Filter proyek..."
            />
          </div>

          {/* Category Filter */}
          <div style={{ width: 200 }}>
            <Select2
              options={[{ value: null, label: 'Semua Kategori' }, ...categoryOptions.filter(c => c.value)]}
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              placeholder="Filter kategori..."
            />
          </div>
        </div>

        {/* Counter & Active Filter Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {pendingDeletionCount > 0 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterPendingDeletion(prev => !prev)}
              style={{
                background: filterPendingDeletion ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                color: filterPendingDeletion ? '#ef4444' : '#f59e0b',
                border: filterPendingDeletion ? '1px solid #ef4444' : '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Filter tugas yang sedang menunggu persetujuan penghapusan"
            >
              <AlertTriangle size={14} />
              <span>Menunggu Approval ({pendingDeletionCount})</span>
            </button>
          )}

          {(selectedProjectId || selectedCategory || searchQuery || filterPendingDeletion) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedCategory(null);
                setSearchQuery('');
                setFilterPendingDeletion(false);
              }}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              Reset Filter
            </button>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filteredTasks.length}</strong> dari {tasks.length} tugas
          </span>
        </div>
      </div>

      {/* Main Content: Either Grid Table View OR Kanban Columns */}
      {viewMode === 'grid' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: 'center' }}>No</th>
                  <th>Uraian Tugas</th>
                  <th>Proyek</th>
                  <th>Kategori & Milestone</th>
                  <th>PIC / Assignee</th>
                  <th>Prioritas</th>
                  <th>Status</th>
                  <th>Tenggat (Deadline)</th>
                  <th style={{ textAlign: 'right', width: 130 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <Search size={32} style={{ opacity: 0.4 }} />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          Tidak ada tugas yang sesuai
                        </div>
                        <div style={{ fontSize: '0.82rem' }}>
                          Coba sesuaikan kata kunci pencarian di atas atau bersihkan filter proyek/kategori.
                        </div>
                        {(selectedProjectId || selectedCategory || searchQuery) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setSelectedProjectId(null); setSelectedCategory(null); setSearchQuery(''); }}
                            style={{ marginTop: 4 }}
                          >
                            Hapus Semua Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, idx) => (
                    <tr 
                      key={task.id}
                      style={{
                        borderLeft: `4px solid ${task.projectColor || '#6366f1'}`
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div 
                          onClick={() => openEditModal(task)}
                          style={{ 
                            fontWeight: 600, 
                            color: 'var(--text-primary)', 
                            fontSize: '0.9rem', 
                            marginBottom: 2,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                          title="Klik untuk melihat detail & edit tugas"
                        >
                          <span style={{ textDecoration: 'none' }}>{task.title}</span>
                          <Edit3 size={13} style={{ opacity: 0.5, color: 'var(--primary)', flexShrink: 0 }} />
                        </div>
                        {task.isPendingDeletion && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            marginTop: 3
                          }}>
                            <AlertTriangle size={11} />
                            <span>Menunggu Persetujuan Hapus</span>
                            {task.deletionReason && <span style={{ fontWeight: 400, fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>: "{task.deletionReason}"</span>}
                          </div>
                        )}
                        {task.description && (
                          <div style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            maxWidth: 380,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={task.description}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: `${task.projectColor || '#6366f1'}18`,
                            color: task.projectColor || '#6366f1',
                            border: `1px solid ${task.projectColor || '#6366f1'}40`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                          title={`Proyek: ${task.projectName}`}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: task.projectColor || '#6366f1' }}></span>
                          <span>{task.projectCode || task.projectName}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          {task.category && (
                            <span 
                              style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 700, 
                                padding: '2px 7px', 
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
                                fontSize: '0.68rem', 
                                fontWeight: 600, 
                                padding: '2px 7px', 
                                borderRadius: '4px', 
                                background: 'rgba(16, 185, 129, 0.12)', 
                                color: 'var(--success)',
                                border: '1px solid rgba(16, 185, 129, 0.25)' 
                              }}
                            >
                              🚩 {task.milestone}
                            </span>
                          )}
                          {!task.category && !task.milestone && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#4f46e5',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            flexShrink: 0
                          }}>
                            {task.assigneeName ? task.assigneeName.charAt(0) : '?'}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {task.assigneeName || 'Belum ditugaskan'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${priorityBadgeClass(task.priority)}`} style={{ fontSize: '0.72rem' }}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="form-control"
                          style={{
                            height: 28,
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: task.status === 'Done' ? '#10b981' : task.status === 'InProgress' ? '#6366f1' : task.status === 'InReview' ? '#f59e0b' : 'var(--text-secondary)',
                            background: task.status === 'Done' ? 'rgba(16, 185, 129, 0.1)' : task.status === 'InProgress' ? 'rgba(99, 102, 241, 0.1)' : task.status === 'InReview' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'transparent'
                          }}
                        >
                          <option value="Todo">To Do</option>
                          <option value="InProgress">In Progress</option>
                          <option value="InReview">In Review</option>
                          <option value="Done">Done</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {task.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(task)}
                            title="Detail & Edit Tugas"
                            style={{ padding: '4px 8px', color: 'var(--primary)' }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(task, 'comments')}
                            title="Diskusi & Komentar Tugas"
                            style={{ 
                              padding: '4px 8px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 4, 
                              color: task.commentCount > 0 ? 'var(--primary)' : 'var(--text-muted)' 
                            }}
                          >
                            <MessageSquare size={13} />
                            {task.commentCount > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{task.commentCount}</span>}
                          </button>
                          {task.status !== 'Done' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                const nextStatus = task.status === 'Todo' ? 'InProgress' : task.status === 'InProgress' ? 'InReview' : 'Done';
                                handleStatusChange(task.id, nextStatus);
                              }}
                              title="Majukan Status"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <ArrowRight size={13} />
                            </button>
                          )}
                          {task.isPendingDeletion && task.canApproveDeletion ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleApproveDeletion(task)}
                                title="Setujui Penghapusan Tugas"
                                style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', fontSize: '0.72rem' }}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRejectDeletion(task)}
                                title="Tolak Pengajuan Hapus"
                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : task.isPendingDeletion && task.deletionRequestedById === user?.id ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancelDeletionRequest(task)}
                              title="Batalkan Pengajuan Hapus"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#f59e0b' }}
                            >
                              <Ban size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteTask(task)}
                              title={task.canApproveDeletion ? "Hapus Tugas Permanen" : "Ajukan Penghapusan Tugas"}
                              style={{ padding: '4px 8px', color: '#ef4444' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Columns */
        <div className="kanban-board">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            const isColumnHovered = dragOverColId === col.id;
            return (
              <div 
                key={col.id} 
                className={`kanban-column ${isColumnHovered ? 'is-drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{
                  borderColor: isColumnHovered ? col.color : undefined,
                  backgroundColor: isColumnHovered ? `${col.color}12` : undefined,
                  boxShadow: isColumnHovered ? `0 0 16px ${col.color}25` : undefined,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div className="kanban-header">
                  <div className="kanban-title" style={{ color: col.color }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }}></span>
                    <span>{col.title}</span>
                  </div>
                  <span className="kanban-count">{colTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 120 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tidak ada tugas
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`kanban-card ${draggedTaskId === task.id ? 'is-dragging' : ''}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        style={{
                          borderLeft: `4px solid ${task.projectColor || '#6366f1'}`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          opacity: draggedTaskId === task.id ? 0.35 : 1,
                          transform: draggedTaskId === task.id ? 'scale(0.97)' : undefined,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <GripVertical size={13} style={{ color: 'var(--text-muted)', opacity: 0.5, cursor: 'grab' }} />
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
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`badge ${priorityBadgeClass(task.priority)}`}>
                              {task.priority}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(task);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 4
                              }}
                              title="Detail & Edit Tugas"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 
                          onClick={() => openEditModal(task)}
                          style={{ 
                            fontSize: '0.925rem', 
                            fontWeight: 700, 
                            marginBottom: 6, 
                            color: 'var(--text-primary)',
                            cursor: 'pointer' 
                          }}
                          title="Klik untuk melihat detail & edit tugas"
                        >
                          {task.title}
                        </h4>

                        {/* Pending Deletion Warning Box on Kanban Card */}
                        {task.isPendingDeletion && (
                          <div style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            marginBottom: 8,
                            fontSize: '0.72rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 700, gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} />
                                <span>Menunggu Approval Hapus</span>
                              </div>
                              {task.canApproveDeletion ? (
                                <div style={{ display: 'flex', gap: 3 }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveDeletion(task);
                                    }}
                                    style={{ padding: '2px 5px', fontSize: '0.68rem', background: '#ef4444', color: '#fff' }}
                                    title="Setujui Hapus"
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectDeletion(task);
                                    }}
                                    style={{ padding: '2px 5px', fontSize: '0.68rem' }}
                                    title="Tolak Pengajuan"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (task.deletionRequestedById === user?.id && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelDeletionRequest(task);
                                  }}
                                  style={{ padding: '2px 5px', fontSize: '0.65rem' }}
                                  title="Batalkan Pengajuan Hapus"
                                >
                                  Batal
                                </button>
                              ))}
                            </div>
                            {task.deletionReason && (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{task.deletionReason}"
                              </div>
                            )}
                          </div>
                        )}

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(task, 'comments');
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                color: task.commentCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 4,
                                fontSize: '0.74rem',
                                fontWeight: 600
                              }}
                              title="Diskusi & Komentar Tugas"
                            >
                              <MessageSquare size={13} />
                              <span>{task.commentCount || 0}</span>
                            </button>
                            {task.estimatedHours > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                <span>{task.estimatedHours}h</span>
                              </div>
                            )}
                          </div>
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

                  {/* Dropzone Indicator when hovering with a dragged card from another column */}
                  {isColumnHovered && draggedTaskId && !colTasks.some(t => t.id === draggedTaskId) && (
                    <div style={{
                      border: `2px dashed ${col.color}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: col.color,
                      background: `${col.color}10`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}>
                      <span>Lepaskan tugas di sini ({col.title})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Edit & Detail Task Modal */}
      {showEditModal && editingTask && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: 840, width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: `${editingTask.projectColor || '#6366f1'}20`,
                  color: editingTask.projectColor || '#6366f1',
                  border: `1px solid ${editingTask.projectColor || '#6366f1'}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckSquare size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Detail & Edit Tugas
                    </h3>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      background: 'rgba(255,255,255,0.08)', 
                      color: 'var(--text-muted)' 
                    }}>
                      #TSK-{editingTask.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Proyek: <strong style={{ color: editingTask.projectColor || 'var(--text-primary)' }}>{editingTask.projectName || editingTask.projectCode}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Quick Status Bar inside Modal Header */}
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 2,
                  gap: 2
                }}>
                  {columns.map(c => {
                    const isActive = editingTask.status === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditingTask({ ...editingTask, status: c.id })}
                        style={{
                          background: isActive ? c.color : 'transparent',
                          color: isActive ? '#fff' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: 'calc(var(--radius-md) - 3px)',
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {c.title}
                      </button>
                    );
                  })}
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowEditModal(false)}
                  style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Pending Deletion Warning Alert Banner inside Modal */}
            {editingTask.isPendingDeletion && (
              <div style={{
                margin: '16px 24px 0',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 260 }}>
                  <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f59e0b' }}>
                      Permohonan Penghapusan Tugas Sedang Menunggu Persetujuan
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Diajukan oleh <strong>{editingTask.deletionRequestedByName || 'Anggota Tim'}</strong> {editingTask.deletionRequestedAt ? `(${formatRelativeTime(editingTask.deletionRequestedAt)})` : ''}
                    </div>
                    {editingTask.deletionReason && (
                      <div style={{ 
                        fontSize: '0.78rem', 
                        color: 'var(--text-muted)', 
                        marginTop: 4, 
                        fontStyle: 'italic', 
                        background: 'rgba(0,0,0,0.18)', 
                        padding: '4px 10px', 
                        borderRadius: 4,
                        borderLeft: '2px solid #f59e0b'
                      }}>
                        "{editingTask.deletionReason}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Approval Actions inside Modal Banner */}
                {editingTask.canApproveDeletion ? (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleApproveDeletion(editingTask)}
                      style={{ background: '#ef4444', color: '#fff', fontSize: '0.78rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Check size={14} />
                      <span>Setujui Hapus</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRejectDeletion(editingTask)}
                      style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <X size={14} />
                      <span>Tolak</span>
                    </button>
                  </div>
                ) : (editingTask.deletionRequestedById === user?.id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCancelDeletionRequest(editingTask)}
                    style={{ fontSize: '0.78rem', padding: '6px 14px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Ban size={14} />
                    <span>Batalkan Pengajuan Hapus</span>
                  </button>
                ))}
              </div>
            )}

            {/* Modal Tabs Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              padding: '0 24px',
              background: 'rgba(255, 255, 255, 0.02)',
              gap: 8
            }}>
              <button
                type="button"
                onClick={() => setModalTab('details')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: modalTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'details' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                <Edit3 size={15} />
                <span>Rincian Tugas</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('comments')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'comments' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: modalTab === 'comments' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'comments' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                <MessageSquare size={15} />
                <span>Diskusi & Komentar</span>
                {comments.length > 0 && (
                  <span style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10
                  }}>
                    {comments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('activities')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: modalTab === 'activities' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: modalTab === 'activities' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: modalTab === 'activities' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                <History size={15} />
                <span>Riwayat Aktivitas</span>
                {activities.length > 0 && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 10
                  }}>
                    {activities.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Task Details Form */}
            {modalTab === 'details' && (
              <form onSubmit={handleSaveEditTask}>
                <div className="modal-body" style={{ padding: '20px 24px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 24
                  }}>
                    {/* Left Column: Core Task Scope */}
                    <div>
                      <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Judul Tugas *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                          placeholder="Uraian pekerjaan tugas..."
                          required
                          style={{ fontSize: '0.9rem', fontWeight: 500 }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Deskripsi Pekerjaan *</label>
                        <textarea
                          className="form-control"
                          rows={6}
                          value={editingTask.description}
                          onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                          placeholder="Jelaskan kebutuhan teknis, acceptance criteria, atau catatan pengerjaan..."
                          required
                          style={{ fontSize: '0.85rem', lineHeight: 1.5 }}
                        />
                      </div>
                    </div>

                    {/* Right Column: Parameters & Attributes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Proyek Tujuan *</label>
                        <Select2
                          options={projectOptions}
                          value={editingTask.projectId}
                          onChange={(val) => {
                            const p = projects.find(proj => proj.id === val);
                            setEditingTask({ 
                              ...editingTask, 
                              projectId: val,
                              projectName: p?.name,
                              projectCode: p?.code,
                              projectColor: p?.color
                            });
                          }}
                          placeholder="Pilih proyek..."
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>PIC / Pelaksana Tugas</label>
                        <Select2
                          options={[{ value: null, label: 'Tanpa Assignee (Unassigned)' }, ...memberOptions]}
                          value={editingTask.assigneeId}
                          onChange={(val) => setEditingTask({ ...editingTask, assigneeId: val })}
                          placeholder="Pilih pelaksana..."
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Kategori Acuan</label>
                          <Select2
                            options={categoryOptions}
                            value={editingTask.category}
                            onChange={(val) => setEditingTask({ ...editingTask, category: val })}
                            placeholder="Pilih kategori..."
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Prioritas Kerja</label>
                          <Select2
                            options={priorityOptions}
                            value={editingTask.priority}
                            onChange={(val) => setEditingTask({ ...editingTask, priority: val })}
                            placeholder="Tingkat prioritas..."
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Milestone SDLC</label>
                        <Select2
                          options={milestoneOptions}
                          value={editingTask.milestone}
                          onChange={(val) => setEditingTask({ ...editingTask, milestone: val })}
                          placeholder="Tahapan milestone..."
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Deadline</label>
                          <input
                            type="date"
                            className="form-control"
                            value={editingTask.dueDate}
                            onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                            style={{ height: 38, fontSize: '0.82rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Estimasi Jam</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="form-control"
                            value={editingTask.estimatedHours}
                            onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: e.target.value })}
                            style={{ height: 38, fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>

                      {editingTask.createdAt && (
                        <div style={{
                          paddingTop: 10,
                          borderTop: '1px solid var(--border-color)',
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Dibuat: {new Date(editingTask.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            color: editingTask.projectColor || 'var(--primary)',
                            fontWeight: 600 
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: editingTask.projectColor || 'var(--primary)' }} />
                            {editingTask.projectCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {editingTask.isPendingDeletion ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {editingTask.canApproveDeletion ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleApproveDeletion(editingTask)}
                            style={{ background: '#ef4444', color: '#fff', fontSize: '0.8rem' }}
                          >
                            <Check size={14} />
                            <span>Setujui & Hapus</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRejectDeletion(editingTask)}
                            style={{ fontSize: '0.8rem' }}
                          >
                            <X size={14} />
                            <span>Tolak Pengajuan</span>
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <AlertTriangle size={14} />
                            <span>Menunggu Persetujuan Hapus</span>
                          </span>
                          {editingTask.deletionRequestedById === user?.id && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancelDeletionRequest(editingTask)}
                              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDeleteTask(editingTask)}
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
                    >
                      <Trash2 size={15} />
                      <span>{editingTask.canApproveDeletion ? 'Hapus Tugas' : 'Ajukan Hapus Tugas'}</span>
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowEditModal(false)}
                      disabled={savingEdit}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingEdit}
                      style={{ minWidth: 150 }}
                    >
                      {savingEdit ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare size={15} />
                          <span>Simpan Perubahan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Tab 2: Comments & Team Discussion Feed */}
            {modalTab === 'comments' && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingRight: 6
                }}>
                  {loadingComments ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                      <div>Memuat percakapan...</div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-muted)'
                    }}>
                      <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        Belum ada komentar pada tugas ini
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                        Tuliskan catatan teknis, perkembangan tugas, atau instruksi kerja di bawah ini.
                      </div>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              flexShrink: 0
                            }}>
                              {c.userName ? c.userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                  {c.userName}
                                </span>
                                <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                  {c.userRole}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                {formatRelativeTime(c.createdAt)}
                              </div>
                            </div>
                          </div>

                          {c.isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              title="Hapus Komentar"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{
                          fontSize: '0.86rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          paddingLeft: 42
                        }}>
                          {c.comment}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input New Comment */}
                <form onSubmit={handleAddComment} style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Tulis tanggapan atau catatan kerja... (Tekan Ctrl+Enter untuk mengirim)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') {
                          handleAddComment(e);
                        }
                      }}
                      style={{ fontSize: '0.86rem', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Mendukung baris baru (Shift+Enter) & kirim cepat (Ctrl+Enter)
                    </span>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingComment || !newComment.trim()}
                      style={{ minWidth: 140 }}
                    >
                      {submittingComment ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Kirim Komentar</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 3: Activities Timeline */}
            {modalTab === 'activities' && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: 6
                }}>
                  {loadingActivities ? (
                    <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                      <div>Memuat riwayat aktivitas...</div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-muted)'
                    }}>
                      <History size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        Belum ada aktivitas tercatat
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      position: 'relative',
                      paddingLeft: 28,
                      borderLeft: '2px solid var(--border-color)',
                      marginLeft: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 20
                    }}>
                      {activities.map((a) => {
                        const isCreated = a.actionType === 'Created';
                        const isStatus = a.actionType === 'StatusChanged';
                        const isComment = a.actionType === 'CommentAdded';
                        const dotColor = isCreated ? '#10b981' : isStatus ? '#6366f1' : isComment ? '#0ea5e9' : '#f59e0b';

                        return (
                          <div key={a.id} style={{ position: 'relative' }}>
                            {/* Node Dot */}
                            <div style={{
                              position: 'absolute',
                              left: -35,
                              top: 2,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: dotColor,
                              border: '2px solid var(--bg-surface)',
                              boxShadow: `0 0 0 2px ${dotColor}40`
                            }} />

                            <div style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 14px',
                              fontSize: '0.84rem'
                            }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                                {a.description}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                <span>{formatRelativeTime(a.createdAt)}</span>
                                {a.userName && (
                                  <>
                                    <span>•</span>
                                    <span>oleh <strong>{a.userName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <div style={{ marginTop: 6, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      💡 <strong>Mendukung Multi-Sheet:</strong> Seluruh sheet dalam berkas Excel akan dibaca dan diverifikasi secara otomatis.<br />
                      💡 Nama proyek di Kolom ke-2 yang belum terdaftar di sistem akan otomatis dibuatkan proyek baru.
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
