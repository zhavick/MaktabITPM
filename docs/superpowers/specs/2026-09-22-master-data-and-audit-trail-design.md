# Design Document: Modul Master Data, Warna Proyek, dan Grafik Audit Trail

Tanggal: 2026-09-22  
Status: Approved  

---

## 1. Ringkasan & Tujuan Sistem

Dokumen ini menjelaskan rancangan arsitektur dan spesifikasi teknis untuk penambahan subsistem **Modul Master Data**, kustomisasi **Warna Proyek (Project Color) beserta dampaknya pada Kartu Tugas Kanban**, serta peningkatan **Jejak Audit (Audit Trail)** dengan visualisasi **Grafik Garis Interaktif (Line Chart)** dan filter multi-kriteria (User, Modul, Rentang Tanggal).

---

## 2. Rincian Fitur & Fungsionalitas

### A. Modul Master Data (`/master-data`)
Tersedia menu baru di Sidebar **"Master Data"** yang dapat diakses oleh peran `Admin` dan `ProjectManager`. Halaman ini menggunakan navigasi tab yang memuat 6 entitas:

1. 📁 **Proyek (Projects)**:
   - Manajemen penuh proyek (Tambah, Edit, Hapus, Filter Tipe/Status).
   - Pengaturan atribut: Nama, Kode, Deskripsi, Klien, Tanggal Mulai & Selesai, Status, Budget, Anggota Tim, **Tipe Proyek**, dan **Warna Proyek (Color Hex)**.
2. 🏷️ **Kategori (Categories)**:
   - Kategori tugas dan dokumen (*Enhancement, New Application, Bug, Maintenance, Migration, Dokumen, Database, Backend, Frontend, Testing*).
   - Kode, Nama, Keterangan, Toggle Aktif/Nonaktif, Edit, Hapus.
3. ⚡ **Prioritas (Priorities)**:
   - Tingkatan prioritas tugas (*Critical, High, Medium, Low*).
   - Kode, Nama, Pemilih Warna Badge Hex (misal: `#ef4444`, `#f97316`, `#3b82f6`, `#64748b`), Level Urutan Sort, Aksi.
4. 🚩 **Milestone (Milestone SDLC)**:
   - Tahapan siklus pengembangan (*Inisiasi & Analisis, FSD / TSD, Pengembangan API, QA & Testing, UAT, Deployment & Go-Live*).
   - Nama fase, Urutan pengerjaan, Deskripsi ringkas.
5. 👥 **Jenis User (User Types / Roles)**:
   - Tipe & peran akun sistem (*Admin, ProjectManager, Caretaker, InternalEmployee, Consultant*).
   - Deskripsi kewenangan, status aktif.
6. 🏢 **Tipe Project (Project Types)**:
   - Klasifikasi proyek (*New Application, Enhancement / CR, Manage Service, API & System Integration, Infrastructure & Cloud, Research & Development*).
   - Kode, Nama, Deskripsi.

---

### B. Warna Proyek (Project Color) & Dampaknya pada Modul Tugas
- Setiap proyek memiliki properti warna (`Color`, default `#4f46e5`).
- Pada form Tambah/Edit Proyek di Master Data, disediakan pemilih warna cepat (*color swatches palette*: Indigo, Emerald, Amber, Rose, Cyan, Violet, Blue) serta input custom HEX.
- **Dampak pada Kartu Tugas (Kanban Board)**:
  - Pada kartu tugas di papan Kanban (`TasksPage.jsx`), ditampilkan aksen strip warna proyek di tepi kiri kartu (*accent border-left: 4px solid [ProjectColor]*).
  - Badge nama proyek di kartu tugas menggunakan warna proyek tersebut dengan latar belakang transparan bergradasi.
  - Memudahkan identifikasi proyek saat pengguna memilih filter *"Semua Proyek"*.

---

### C. Visualisasi Grafik Garis Audit Trail & Filter Lanjutan
- **Interactive SVG Line Chart**:
  - Kurva halus (*smooth bezier line*) dengan area gradien lembut (*glow gradient fill*).
  - Titik data interaktif (*nodes*) pada setiap tanggal rekaman aktivitas.
  - **Hover Tooltip**: Menampilkan tanggal, jumlah log kejadian, dan distribusi modul yang aktif pada hari tersebut.
  - Kartu metrik analitik: **Total Aktivitas**, **Pengguna Paling Aktif**, **Puncak Aktivitas (Peak Day)**, dan **Rasio Warning/Security**.
- **Filter Multi-Kriteria**:
  - **Filter Pengguna (User)**: Dropdown pilihan user spesifik atau Semua User.
  - **Filter Modul**: Dropdown pilihan modul (Auth, Tasks, Projects, MasterData, Timesheets, Tickets, System, Database, dsb.).
  - **Rentang Tanggal**: Input `startDate` dan `endDate` dengan tombol pintas cepat (*Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, Semua*).
  - **Pencarian Bebas**: Pencarian teks pada isi pesan log.

---

## 3. Arsitektur Data & Skema Backend

### 3.1 Model Database (`MasterDataItem`)
File: `backend/Models/MasterData.cs`
```csharp
public class MasterDataItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // Category, Priority, Milestone, UserType, ProjectType

    [Required]
    [MaxLength(100)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? BadgeColor { get; set; } // Hex code e.g. #ef4444

    public int SortOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

### 3.2 Pembaruan Model `Project`
File: `backend/Models/Project.cs`
- Tambah properti:
  - `[MaxLength(50)] public string? ProjectType { get; set; } = "New Application";`
  - `[MaxLength(20)] public string Color { get; set; } = "#4f46e5";`

### 3.3 Pembaruan DTO & Controller
- `TaskResponseDto`: ditambahkan `ProjectColor` (string) agar frontend Kanban dapat langsung merender warna tanpa query tambahan.
- `MasterDataController.cs`:
  - `GET /api/master-data?type={type}&activeOnly={bool}`
  - `POST /api/master-data`
  - `PUT /api/master-data/{id}`
  - `DELETE /api/master-data/{id}`
- `AuditLogsController.cs`:
  - `GET /api/audit-logs` (Mendukung `userName`, `module`, `severity`, `search`, `startDate`, `endDate`, `limit`).
  - `GET /api/audit-logs/trend` (Agregasi timeline aktivitas per tanggal untuk grafik).

---

## 4. Rincian Komponen Frontend

1. `frontend/src/pages/MasterDataPage.jsx`: Halaman induk Master Data dengan 6 tab dinamis, form modal tambah/edit, pemilih palet warna, dan tabel responsif.
2. `frontend/src/pages/AuditTrailPage.jsx`: Integrasi komponen `AuditLineChart` interaktif murni berbasis SVG dengan tooltips, filter rentang tanggal, filter modul, dan filter pengguna.
3. `frontend/src/pages/TasksPage.jsx`: Integrasi strip aksen warna proyek dan badge warna pada kartu Kanban.
4. `frontend/src/components/Sidebar.jsx`: Penambahan menu "Master Data" dengan proteksi otorisasi Admin/PM.
5. `frontend/src/App.jsx`: Registrasi rute `/master-data`.

---

## 5. Rencana Pengujian

1. **Pengujian Backend**:
   - Auto-seeder menginisialisasi seluruh master lookup pada startup.
   - Endpoint CRUD master data merespons dengan status 200/201 dan validasi 400.
   - Endpoint agregasi trend audit logs menghitung frekuensi per tanggal dengan tepat.
2. **Pengujian Frontend**:
   - Pindah antar-tab Master Data berjalan mulus tanpa reload halaman.
   - Menambahkan dan mengubah warna proyek segera tercermin pada kartu tugas di halaman Tugas Kanban.
   - Mengubah filter (Nama User, Modul, Rentang Waktu) secara otomatis memicu pembaruan kurva garis pada grafik line chart dan tabel log audit.
