import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Tag, 
  Flag, 
  Milestone as MilestoneIcon, 
  Users, 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Check, 
  RefreshCw, 
  Palette, 
  Calendar, 
  DollarSign, 
  Briefcase,
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';
import api from '../utils/api';
import { showToast, confirmDialog, errorAlert } from '../utils/swal';
import { useSync } from '../context/SyncContext';

const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Slate', hex: '#64748b' },
  { name: 'Teal', hex: '#14b8a6' }
];

export default function MasterDataPage() {
  const { syncTick } = useSync();
  const [activeTab, setActiveTab] = useState('projects');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    clientName: '',
    budget: 0,
    projectType: 'Web Application',
    color: '#6366f1',
    startDate: '',
    endDate: '',
    status: 'Active'
  });

  const [showGenericModal, setShowGenericModal] = useState(false);
  const [editingGeneric, setEditingGeneric] = useState(null);
  const [genericForm, setGenericForm] = useState({
    type: '',
    code: '',
    name: '',
    description: '',
    badgeColor: '#6366f1',
    sortOrder: 1,
    isActive: true
  });

  useEffect(() => {
    loadAllData();
  }, [syncTick]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projRes, masterRes] = await Promise.all([
        api.get('/projects'),
        api.get('/master-data')
      ]);

      setProjects(projRes.data.data || []);
      const masterItems = masterRes.data.data || [];

      setCategories(masterItems.filter(i => i.type === 'Category'));
      setPriorities(masterItems.filter(i => i.type === 'Priority'));
      setMilestones(masterItems.filter(i => i.type === 'Milestone'));
      setUserTypes(masterItems.filter(i => i.type === 'UserType'));
      setProjectTypes(masterItems.filter(i => i.type === 'ProjectType'));
    } catch (err) {
      console.error('Failed loading master data', err);
      showToast('Gagal memuat Master Data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tab definitions
  const tabs = [
    { id: 'projects', label: 'Proyek', icon: FolderKanban, count: projects.length },
    { id: 'categories', label: 'Kategori', icon: Tag, count: categories.length, type: 'Category' },
    { id: 'priorities', label: 'Prioritas', icon: Flag, count: priorities.length, type: 'Priority' },
    { id: 'milestones', label: 'Milestone', icon: MilestoneIcon, count: milestones.length, type: 'Milestone' },
    { id: 'userTypes', label: 'Jenis User', icon: Users, count: userTypes.length, type: 'UserType' },
    { id: 'projectTypes', label: 'Tipe Project', icon: Layers, count: projectTypes.length, type: 'ProjectType' },
  ];

  // Helper to open project modal
  const openProjectModal = (proj = null) => {
    if (proj) {
      setEditingProject(proj);
      setProjectForm({
        name: proj.name || '',
        code: proj.code || '',
        description: proj.description || '',
        clientName: proj.clientName || '',
        budget: proj.budget || 0,
        projectType: proj.projectType || 'Web Application',
        color: proj.color || '#6366f1',
        startDate: proj.startDate ? proj.startDate.split('T')[0] : '',
        endDate: proj.endDate ? proj.endDate.split('T')[0] : '',
        status: proj.status || 'Active'
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        code: '',
        description: '',
        clientName: '',
        budget: 0,
        projectType: projectTypes[0]?.name || 'Web Application',
        color: '#6366f1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'Active'
      });
    }
    setShowProjectModal(true);
  };

  // Helper to save project
  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.code) {
      errorAlert('Data Tidak Lengkap', 'Nama dan Kode Proyek wajib diisi.');
      return;
    }

    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, projectForm);
        showToast('Proyek berhasil diperbarui!');
      } else {
        await api.post('/projects', projectForm);
        showToast('Proyek baru berhasil dibuat!');
      }
      setShowProjectModal(false);
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan proyek.';
      errorAlert('Gagal', msg);
    }
  };

  // Helper to delete project
  const handleDeleteProject = async (proj) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Proyek?',
      text: `Proyek "${proj.name}" (${proj.code}) akan dihapus. Periksa apakah masih ada tugas aktif di dalamnya.`,
      icon: 'warning',
      confirmButtonText: 'Ya, Hapus Proyek',
      confirmButtonColor: '#ef4444'
    });
    if (confirmed) {
      try {
        await api.delete(`/projects/${proj.id}`);
        showToast('Proyek berhasil dihapus.');
        loadAllData();
      } catch (err) {
        const msg = err.response?.data?.message || 'Gagal menghapus proyek.';
        errorAlert('Gagal', msg);
      }
    }
  };

  // Helper for generic master data modal
  const openGenericModal = (type, item = null) => {
    const currentTabObj = tabs.find(t => t.id === activeTab);
    const resolvedType = type || currentTabObj?.type || 'Category';

    if (item) {
      setEditingGeneric(item);
      setGenericForm({
        type: item.type,
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        badgeColor: item.badgeColor || '#6366f1',
        sortOrder: item.sortOrder || 1,
        isActive: item.isActive !== false
      });
    } else {
      setEditingGeneric(null);
      setGenericForm({
        type: resolvedType,
        code: '',
        name: '',
        description: '',
        badgeColor: '#6366f1',
        sortOrder: 1,
        isActive: true
      });
    }
    setShowGenericModal(true);
  };

  // Helper to save generic master data
  const handleSaveGeneric = async (e) => {
    e.preventDefault();
    if (!genericForm.name || !genericForm.code) {
      errorAlert('Data Tidak Lengkap', 'Nama dan Kode item wajib diisi.');
      return;
    }

    try {
      if (editingGeneric) {
        await api.put(`/master-data/${editingGeneric.id}`, genericForm);
        showToast('Master data berhasil diperbarui!');
      } else {
        await api.post('/master-data', genericForm);
        showToast('Master data baru berhasil ditambahkan!');
      }
      setShowGenericModal(false);
      loadAllData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan master data.';
      errorAlert('Gagal', msg);
    }
  };

  // Helper to delete generic master data
  const handleDeleteGeneric = async (item) => {
    const confirmed = await confirmDialog({
      title: `Hapus ${item.name}?`,
      text: `Item master data "${item.name}" (${item.code}) akan dihapus.`,
      icon: 'warning',
      confirmButtonText: 'Hapus',
      confirmButtonColor: '#ef4444'
    });
    if (confirmed) {
      try {
        await api.delete(`/master-data/${item.id}`);
        showToast('Item berhasil dihapus.');
        loadAllData();
      } catch (err) {
        const msg = err.response?.data?.message || 'Gagal menghapus item.';
        errorAlert('Gagal', msg);
      }
    }
  };

  // Filter current tab data based on search query
  const getActiveTabData = () => {
    const q = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'projects':
        return projects.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.code.toLowerCase().includes(q) ||
          (p.projectType && p.projectType.toLowerCase().includes(q)) ||
          (p.clientName && p.clientName.toLowerCase().includes(q))
        );
      case 'categories':
        return categories.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
      case 'priorities':
        return priorities.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
      case 'milestones':
        return milestones.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
      case 'userTypes':
        return userTypes.filter(u => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q));
      case 'projectTypes':
        return projectTypes.filter(pt => pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q));
      default:
        return [];
    }
  };

  const currentTabObj = tabs.find(t => t.id === activeTab);
  const tabData = getActiveTabData();

  return (
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Modul Master Data
            </h1>
            <span className="badge badge-primary">Sistem Enterprise</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Kelola data acuan standar aplikasi: Proyek & Warna Proyek, Kategori, Prioritas, Milestone, Jenis User, dan Tipe Project.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>

          {activeTab === 'projects' ? (
            <button
              type="button"
              onClick={() => openProjectModal()}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} />
              <span>Tambah Proyek Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openGenericModal(currentTabObj?.type)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} />
              <span>Tambah {currentTabObj?.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-card-solid)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                padding: '2px 7px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Toolbar */}
      <div className="card" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        padding: '14px 20px',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder={`Cari dalam ${currentTabObj?.label}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Menampilkan <strong>{tabData.length}</strong> data terdaftar
        </div>
      </div>

      {/* Tab Content Table */}
      <div className="card" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        padding: 0
      }}>
        {activeTab === 'projects' ? (
          /* Projects Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-solid)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warna & Kode</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nama Proyek</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipe Proyek</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Klien / Sponsor</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tabData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada data proyek ditemukan.
                    </td>
                  </tr>
                ) : (
                  tabData.map(proj => (
                    <tr key={proj.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            title={`Warna Proyek: ${proj.color || '#6366f1'}`}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              backgroundColor: proj.color || '#6366f1',
                              boxShadow: `0 0 8px ${proj.color || '#6366f1'}60`,
                              display: 'inline-block',
                              flexShrink: 0
                            }}
                          />
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: `${proj.color || '#6366f1'}15`,
                            color: proj.color || '#6366f1',
                            border: `1px solid ${proj.color || '#6366f1'}40`
                          }}>
                            {proj.code}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {proj.name}
                        </div>
                        {proj.description && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {proj.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          {proj.projectType || 'Standard'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {proj.clientName || '-'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {proj.budget ? `Rp ${proj.budget.toLocaleString('id-ID')}` : 'Rp 0'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${proj.status === 'Active' ? 'badge-success' : proj.status === 'Completed' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {proj.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openProjectModal(proj)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Edit Proyek & Warna"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: 'var(--danger)' }}
                            title="Hapus Proyek"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Generic Master Data Table (Category, Priority, Milestone, UserType, ProjectType) */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-solid)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Kode & Badge</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nama Item</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deskripsi</th>
                  {(activeTab === 'priorities' || activeTab === 'milestones') && (
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Urutan</th>
                  )}
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tabData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Tidak ada data {currentTabObj?.label} ditemukan.
                    </td>
                  </tr>
                ) : (
                  tabData.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              backgroundColor: item.badgeColor || '#6366f1',
                              boxShadow: `0 0 6px ${item.badgeColor || '#6366f1'}60`,
                              display: 'inline-block'
                            }}
                          />
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: `${item.badgeColor || '#6366f1'}20`,
                            color: item.badgeColor || '#6366f1',
                            border: `1px solid ${item.badgeColor || '#6366f1'}40`
                          }}>
                            {item.code}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {item.description || '-'}
                      </td>
                      {(activeTab === 'priorities' || activeTab === 'milestones') && (
                        <td style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                          #{item.sortOrder || 1}
                        </td>
                      )}
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${item.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {item.isActive ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openGenericModal(item.type, item)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteGeneric(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: 'var(--danger)' }}
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Modal with Color Palette Picker */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderKanban size={20} style={{ color: projectForm.color || 'var(--primary)' }} />
                <span>{editingProject ? 'Edit Data Proyek' : 'Tambah Proyek Baru'}</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowProjectModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProject}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Nama Proyek *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Digital Banking Revamp"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kode Proyek *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: DBR"
                      value={projectForm.code}
                      onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                {/* PROJECT COLOR CONFIGURATION (Crucial User Requirement) */}
                <div className="form-group" style={{ background: 'var(--bg-card-solid)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <Palette size={16} style={{ color: projectForm.color }} />
                      <span>Warna Proyek (Impact Visual pada Kanban & Card)</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Warna ini akan menghiasi kartu tugas di Kanban
                    </span>
                  </div>

                  {/* Preset Swatches */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setProjectForm({ ...projectForm, color: c.hex })}
                        title={c.name}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: c.hex,
                          border: projectForm.color === c.hex ? '3px solid #ffffff' : '2px solid transparent',
                          boxShadow: projectForm.color === c.hex ? `0 0 10px ${c.hex}` : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {projectForm.color === c.hex && <Check size={16} color="#ffffff" strokeWidth={3} />}
                      </button>
                    ))}

                    {/* Custom HTML5 color input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                      <input
                        type="color"
                        value={projectForm.color}
                        onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                        style={{
                          width: 34,
                          height: 34,
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: 'transparent'
                        }}
                        title="Pilih warna kustom"
                      />
                      <input
                        type="text"
                        value={projectForm.color}
                        onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                        style={{
                          width: 80,
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Kanban Card Preview */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    borderLeft: `4px solid ${projectForm.color}`,
                    border: `1px solid var(--border-color)`,
                    borderLeftWidth: '5px',
                    borderLeftColor: projectForm.color,
                    marginTop: 8
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Simulasi Kartu Tugas Kanban:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: `${projectForm.color}20`,
                        color: projectForm.color,
                        border: `1px solid ${projectForm.color}40`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: projectForm.color }}></span>
                        {projectForm.code || 'PROJ'}
                      </span>
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Medium</span>
                    </div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                      Contoh item pekerjaan di bawah {projectForm.name || 'Proyek Anda'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Tipe Project</label>
                    <select
                      className="form-control"
                      value={projectForm.projectType}
                      onChange={(e) => setProjectForm({ ...projectForm, projectType: e.target.value })}
                    >
                      {projectTypes.length > 0 ? (
                        projectTypes.map(pt => (
                          <option key={pt.code} value={pt.name}>{pt.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Web Application">Web Application</option>
                          <option value="Mobile App">Mobile App</option>
                          <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                          <option value="Security Audit">Security Audit</option>
                          <option value="Consultation">Consultation</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Klien / Sponsor</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nama institusi / klien"
                      value={projectForm.clientName}
                      onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Estimasi Budget (IDR)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({ ...projectForm, budget: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Proyek</label>
                    <select
                      className="form-control"
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    >
                      <option value="Active">Active (Berjalan)</option>
                      <option value="OnHold">OnHold (Ditunda)</option>
                      <option value="Completed">Completed (Selesai)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Proyek</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Ruang lingkup proyek..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? 'Simpan Perubahan' : 'Buat Proyek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generic Master Data Item Modal */}
      {showGenericModal && (
        <div className="modal-overlay" onClick={() => setShowGenericModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={20} style={{ color: genericForm.badgeColor || 'var(--primary)' }} />
                <span>{editingGeneric ? `Edit ${genericForm.type}` : `Tambah ${genericForm.type}`}</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGenericModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGeneric}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kode Unik *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mis: CRIT"
                      value={genericForm.code}
                      onChange={(e) => setGenericForm({ ...genericForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Item *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mis: Critical Issue"
                      value={genericForm.name}
                      onChange={(e) => setGenericForm({ ...genericForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Penjelasan konteks data acuan ini..."
                    value={genericForm.description}
                    onChange={(e) => setGenericForm({ ...genericForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Warna Badge / Aksen</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        value={genericForm.badgeColor}
                        onChange={(e) => setGenericForm({ ...genericForm, badgeColor: e.target.value })}
                        style={{ width: 36, height: 36, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={genericForm.badgeColor}
                        onChange={(e) => setGenericForm({ ...genericForm, badgeColor: e.target.value })}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {(genericForm.type === 'Priority' || genericForm.type === 'Milestone') && (
                    <div className="form-group">
                      <label className="form-label">Urutan Tampil (Sort)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={genericForm.sortOrder}
                        onChange={(e) => setGenericForm({ ...genericForm, sortOrder: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={genericForm.isActive}
                      onChange={(e) => setGenericForm({ ...genericForm, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Aktif dan dapat digunakan di aplikasi</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenericModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGeneric ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
