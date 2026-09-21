import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Tag, Calendar, User, Trash2, Edit3, Folder } from 'lucide-react';
import api from '../utils/api';
import Select2 from '../components/Select2';
import { showToast, confirmDialog, errorAlert } from '../utils/swal';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'General',
    projectId: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, projectsRes] = await Promise.all([
        api.get('/notes'),
        api.get('/projects')
      ]);
      setNotes(notesRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch {
      showToast('Gagal memuat catatan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/notes', form);
      if (res.data.success) {
        showToast('Catatan berhasil disimpan!');
        setShowModal(false);
        fetchData();
        setForm({ title: '', content: '', category: 'General', projectId: null });
      }
    } catch {
      errorAlert('Gagal', 'Terjadi kesalahan saat menyimpan catatan.');
    }
  };

  const handleDelete = async (note) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Catatan?',
      text: `Catatan "${note.title}" akan dihapus permanen.`,
      icon: 'warning',
      confirmButtonText: 'Ya, Hapus'
    });
    if (confirmed) {
      try {
        await api.delete(`/notes/${note.id}`);
        setNotes(prev => prev.filter(n => n.id !== note.id));
        showToast('Catatan berhasil dihapus.');
      } catch {
        showToast('Gagal menghapus catatan', 'error');
      }
    }
  };

  const categories = ['All', 'Meeting', 'Architecture', 'Guide', 'General'];

  const filteredNotes = notes.filter(n => {
    const catMatch = selectedCategory === 'All' || n.category === selectedCategory;
    const searchMatch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
    badge: p.code
  }));

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1>Manajemen Catatan & Dokumentasi</h1>
          <p>Rangkuman rapat teknis, panduan arsitektur sistem, dan catatan kolaborasi tim.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>Buat Catatan Baru</span>
        </button>
      </div>

      {/* Category Pills and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              className="btn btn-sm"
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'var(--primary)' : 'var(--bg-card-solid)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontWeight: selectedCategory === cat ? 700 : 500
              }}
            >
              {cat === 'All' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Cari dalam catatan..."
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat catatan...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, display: 'inline-block' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Belum Ada Catatan</div>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Klik tombol "Buat Catatan Baru" untuk mendokumentasikan hasil rapat atau pedoman arsitektur.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filteredNotes.map(note => (
            <div key={note.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className="badge badge-purple">{note.category}</span>
                  {note.projectName && (
                    <span className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Folder size={11} />
                      <span>{note.projectName}</span>
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{note.title}</h3>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  marginBottom: 16
                }}>
                  {note.content}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} />
                  <span>{note.createdByUserName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{new Date(note.createdAt).toLocaleDateString('id-ID')}</span>
                  <Trash2
                    size={15}
                    onClick={() => handleDelete(note)}
                    style={{ cursor: 'pointer', color: 'var(--danger)' }}
                    title="Hapus Catatan"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create Note */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <span>Dokumentasikan Catatan / Minutes of Meeting</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Dokumen</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Rangkuman Sprint Planning & SLA Deployment"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <Select2
                      options={[
                        { value: 'Meeting', label: 'Meeting Minutes (Catatan Rapat)' },
                        { value: 'Architecture', label: 'Arsitektur & Spesifikasi Teknis' },
                        { value: 'Guide', label: 'Panduan / SOP Operasional' },
                        { value: 'General', label: 'Umum' },
                      ]}
                      value={form.category}
                      onChange={(val) => setForm({ ...form, category: val })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tautkan ke Proyek (Opsional)</label>
                    <Select2
                      options={[{ value: null, label: 'Umum / Tanpa Proyek' }, ...projectOptions]}
                      value={form.projectId}
                      onChange={(val) => setForm({ ...form, projectId: val })}
                      placeholder="Pilih proyek..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Isi Catatan (Dukungan Format Markdown)</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: 180 }}
                    placeholder="Tuliskan poin-poin rapat, deliverable, keputusan arsitektur, dan tindak lanjut..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>Simpan Catatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
