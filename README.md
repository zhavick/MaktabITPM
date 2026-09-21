# Enterprise Project Management Application

Aplikasi sistem manajemen proyek modern yang dirancang untuk melacak pekerjaan **karyawan internal** maupun **konsultan eksternal** secara terintegrasi.

Aplikasi ini mencakup:
1. **Penerimaan Anggota Baru (Hybrid Registration)**: Pendaftaran mandiri dengan alur persetujuan Admin/PM serta fitur undangan langsung.
2. **Onboarding Screen Wizard**: Orientasi 3-langkah untuk penyesuaian profil, pemahaman peran, dan tur fitur sistem.
3. **Manajemen Tugas (Kanban Board)**: Papan visual drag-and-drop dengan 4 kolom (*To Do*, *In Progress*, *In Review*, *Done*), filter proyek, level prioritas, dan assignee.
4. **Manajemen Catatan & Dokumen**: Catatan rapat (*Minutes of Meeting*), spesifikasi teknis, dan dokumentasi berformat Markdown.
5. **Manajemen Timesheet (Dual-Mode)**:
   - **Mode Konsultan**: Pengunduhan template resmi (Excel/CSV), drag-and-drop unggah berkas akhir bulan, verifikasi total jam, dan riwayat status review.
   - **Mode Internal**: Live stopwatch timer dan form input aktivitas harian kontinyu.
   - **Review Queue**: Antrean persetujuan timesheet untuk Project Manager dan Finance dengan SweetAlert2.
6. **Manajemen Presensi / Kehadiran**: Widget interaktif Clock-In dan Clock-Out dengan pilihan mode kerja (*WFO / WFH*), status keterlambatan otomatis, dan rekapitulasi kehadiran bulanan.
7. **Manajemen Tiket Kendala & Caretaker Pool**: Pelaporan insiden/bug aplikasi oleh seluruh anggota tim, antrean terbuka (*Open Ticket Pool*), klaim/penugasan tiket ke tim Caretaker, dan histori diskusi perbaikan hingga *Resolved/Closed*.
8. **Laporan & Ekspor Data**: Metrik analitik perbandingan jam kerja internal vs konsultan serta tombol ekspor langsung ke format **CSV**.

---

## 🛠️ Tech Stack

- **Backend**: ASP.NET Core 8 Web API, C# 12, Entity Framework Core 8 (Pomelo MySQL + SQLite Fallback Engine).
- **Keamanan**: JWT Bearer Authentication & BCrypt Password Hashing.
- **Database**: MySQL 8.0 via Docker (`docker-compose.yml`) & schema auto-seeder.
- **Frontend**: Vite + ReactJS, React Router DOM, Axios.
- **UI Components**:
  - **SweetAlert2 (`sweetalert2`)**: Dialog konfirmasi interaktif, modal approval, dan toast notifikasi.
  - **Select2 Component (`Select2.jsx`)**: Dropdown pencarian cerdas dengan avatar, badges, live search filter, dan multi-select.
  - **Design System**: Vanilla CSS modern (*Plus Jakarta Sans*, Glassmorphism, Dark & Light Mode).

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menggunakan Script Otomatis (Windows)
Cukup klik dua kali atau jalankan berkas:
```cmd
start.bat
```

### Opsi 2: Menjalankan Secara Manual

1. **Jalankan Database MySQL (Docker)**:
   ```bash
   docker compose up -d
   ```
   *(Catatan: Jika Docker Desktop belum aktif, backend secara otomatis beralih ke database SQLite lokal berfitur lengkap tanpa menghentikan aplikasi).*

2. **Jalankan Backend ASP.NET Core API**:
   ```bash
   dotnet run --project backend/ProjectManagement.Api.csproj --launch-profile http
   ```
   - Swagger API Documentation: `http://localhost:5000/swagger`

3. **Jalankan Frontend Vite React**:
   ```bash
   cd frontend
   npm run dev
   ```
   - Akses antarmuka aplikasi di: `http://localhost:5173`

---

## 🔑 Akun Demo Bawaan (Password Semua Akun: `Admin@123`)

| Peran (Role) | Alamat Email | Keterangan |
| :--- | :--- | :--- |
| **System Admin** | `admin@projectmgmt.local` | Akses penuh, persetujuan anggota baru, review timesheet |
| **Project Manager** | `pm@projectmgmt.local` | Manajemen proyek, penugasan tugas, review timesheet |
| **Caretaker Lead** | `caretaker@projectmgmt.local` | Pemelihara aplikasi, klaim & investigasi tiket kendala |
| **Internal Employee** | `employee@projectmgmt.local` | Developer internal, presensi WFO/WFH, log jam harian |
| **Konsultan Eksternal** | `consultant@external.com` | Mitra ahli cloud, upload template timesheet bulanan |
| *Calon Anggota (Pending)* | `agus@mitrabaru.com` | Akun pendaftaran baru yang menunggu approval admin |

---

## 📁 Struktur Direktori

```
ProjectManagement/
├── docker-compose.yml          # Konfigurasi container MySQL 8.0
├── start.bat                   # Script peluncur otomatis
├── backend/
│   ├── init.sql                # Skema dan inisialisasi tabel MySQL
│   ├── Program.cs              # Konfigurasi JWT, CORS, EF Core, dan Swagger
│   ├── Controllers/            # Auth, Members, Projects, Tasks, Notes, Timesheets, Attendance, Tickets, Reports
│   ├── Data/                   # AppDbContext dan data seeder
│   ├── Models/                 # User, Project, TaskItem, Note, Timesheet, Attendance, Ticket
│   ├── DTOs/                   # Request/Response contracts
│   └── Services/               # AuthService, TokenService, TimesheetParserService
└── frontend/
    ├── index.html              # Template HTML dengan Google Font Plus Jakarta Sans
    ├── vite.config.js          # Konfigurasi Vite dan reverse proxy API
    └── src/
        ├── index.css           # Design system Vanilla CSS (Dark/Light mode, Glassmorphism)
        ├── utils/              # api.js (Axios + JWT) dan swal.js (SweetAlert2)
        ├── components/         # Navbar, Sidebar, Select2
        ├── context/            # AuthContext & Theme Provider
        └── pages/              # Login, Register, PendingApproval, Onboarding, Dashboard, Tasks, Notes, Timesheets, Attendance, Tickets, Reports, Members
```
