# Technical Design Specification: Enterprise Project Management Application

- **Date**: 2026-09-21
- **Status**: Approved by User
- **Author**: Antigravity Assistant & Engineering Team
- **Stack**: ASP.NET Core 8 Web API, MySQL 8 (Docker), JWT Bearer Authentication, Vite + ReactJS, Select2, SweetAlert2, Vanilla CSS Design System.

---

## 1. Executive Summary & Problem Statement

Organisasi modern sering kali mengelola proyek yang melibatkan dua jenis tenaga kerja sekaligus:
1. **Karyawan Internal**: Bekerja secara terstruktur harian, memerlukan pencatatan kehadiran (presensi) serta logging jam kerja (*timesheet*) secara kontinyu/real-time.
2. **Konsultan / Mitra Eksternal**: Bekerja berbasis deliverable bulanan, membutuhkan mekanisme penyerahan timesheet bulanan terstandarisasi melalui unggahan dokumen/berkas (Excel/CSV).

Selain itu, ketika terjadi insiden, kendala teknis, atau bug operasional pada sistem/proyek, tim membutuhkan mekanisme pelaporan masalah yang langsung diarahkan ke **Tim Caretaker (Pemangku/Pemelihara Aplikasi)** dengan SLA dan alur penyelesaian yang transparan.

Aplikasi **Enterprise Project Management** ini mengintegrasikan seluruh siklus kerja:
- Penerimaan anggota baru secara hibrida (registrasi mandiri dengan approval & undangan langsung).
- Layar orientasi interaktif (*Onboarding Screen*).
- Manajemen tugas visual (*Kanban & List view*).
- Dokumentasi & catatan rapat (*Notes*).
- Sistem ganda manajemen timesheet (Harian Internal vs Bulanan Konsultan).
- Sistem presensi kehadiran terpadu (*Attendance*).
- Manajemen tiket insiden & penugasan caretaker (*Ticket Caretaker Management*).
- Pelaporan & analitik performa dengan kemampuan ekspor data (*Reports & Exports*).

---

## 2. Arsitektur Sistem & Komponen

Sistem mengadopsi pola **Decoupled Architecture**:
```
+-------------------------------------------------------------+
|                     Frontend Client                         |
|  Vite + ReactJS SPA (Port 5173)                             |
|  - Modern Vanilla CSS (Plus Jakarta Sans, Glassmorphism)    |
|  - SweetAlert2 (Toasts, Confirmation Modals)                |
|  - Select2 / Searchable Dropdowns Component                 |
|  - React Router DOM, Axios Client + JWT Interceptors        |
+-------------------------------------------------------------+
                              |
                              | HTTPS / JSON (Bearer JWT)
                              v
+-------------------------------------------------------------+
|                     Backend Server                          |
|  ASP.NET Core 8 Web API (Port 5000 / 5150)                  |
|  - JWT Bearer Authentication & Role Authorization           |
|  - Entity Framework Core 8 (Pomelo MySQL Provider)          |
|  - Services: Auth, Timesheet (Excel Parser), Ticket, Report |
|  - Global Exception Handling & File Upload Engine           |
|  - Swagger / OpenAPI live documentation                     |
+-------------------------------------------------------------+
                              |
                              | TCP (Port 3306)
                              v
+-------------------------------------------------------------+
|                     Database Tier                           |
|  MySQL 8.0 Engine running via Docker Compose                |
|  - Persistent Volume: mysql_data                            |
|  - Database: project_management_db                          |
|  - Automated Seed Script (Admin, Demo Projects, Users)      |
+-------------------------------------------------------------+
```

---

## 3. Matriks Peran & Kontrol Akses (RBAC)

Aplikasi memiliki 5 peran utama:
1. **Super Admin**: Akses penuh ke seluruh modul, persetujuan anggota, konfigurasi proyek, dan manajemen user.
2. **Project Manager (PM)**: Mengelola proyek, menugaskan anggota tim, membuat dan mengatur tugas, menyetujui timesheet konsultan, dan memantau laporan.
3. **Caretaker**: Bertanggung jawab memelihara kesehatan proyek/aplikasi, mengklaim (*Pick*) tiket permasalahan dari antrean terbuka, menginvestigasi, dan menyelesaikan masalah.
4. **Internal Employee**: Melakukan presensi harian (clock-in/clock-out), mencatat timesheet harian secara kontinyu, mengerjakan tugas yang ditugaskan, membuat catatan rapat, dan melaporkan tiket jika menemukan kendala.
5. **External Consultant**: Mengakses tugas proyek terkait, mengunggah timesheet bulanan dalam format Excel/CSV di akhir bulan, memantau status approval timesheet, dan melaporkan tiket kendala teknis.

---

## 4. Skema Database & Relasi Entitas

### 4.1. Tabel `Users`
- `Id` (INT, PK, Auto Increment)
- `FullName` (VARCHAR 150)
- `Email` (VARCHAR 150, Unique)
- `PasswordHash` (VARCHAR 255)
- `Role` (ENUM: `Admin`, `ProjectManager`, `Caretaker`, `InternalEmployee`, `Consultant`)
- `EmploymentType` (ENUM: `Internal`, `Consultant`)
- `Status` (ENUM: `PendingApproval`, `Active`, `Inactive`, `Rejected`)
- `CompanyOrAgency` (VARCHAR 150, Nullable)
- `HourlyRate` (DECIMAL 12,2, Default 0)
- `AvatarUrl` (VARCHAR 255, Nullable)
- `OnboardingCompleted` (BOOLEAN, Default FALSE)
- `CreatedAt` (DATETIME, Default UTC_TIMESTAMP)
- `UpdatedAt` (DATETIME, Nullable)

### 4.2. Tabel `Projects`
- `Id` (INT, PK, Auto Increment)
- `Name` (VARCHAR 150)
- `Code` (VARCHAR 50, Unique - misal `PRJ-ALPHA`)
- `Description` (TEXT)
- `ClientName` (VARCHAR 150)
- `StartDate` (DATE)
- `EndDate` (DATE, Nullable)
- `Status` (ENUM: `Active`, `OnHold`, `Completed`)
- `Budget` (DECIMAL 15,2)
- `CreatedByUserId` (INT, FK -> Users.Id)
- `CreatedAt` (DATETIME)

### 4.3. Tabel `ProjectMembers`
- `Id` (INT, PK, Auto Increment)
- `ProjectId` (INT, FK -> Projects.Id)
- `UserId` (INT, FK -> Users.Id)
- `RoleInProject` (VARCHAR 50 - misal `Lead`, `Developer`, `Consultant`, `CaretakerLead`, `CaretakerMember`)
- `JoinedAt` (DATETIME)

### 4.4. Tabel `Tasks`
- `Id` (INT, PK, Auto Increment)
- `ProjectId` (INT, FK -> Projects.Id)
- `Title` (VARCHAR 200)
- `Description` (TEXT)
- `Status` (ENUM: `Todo`, `InProgress`, `InReview`, `Done`)
- `Priority` (ENUM: `Low`, `Medium`, `High`, `Urgent`)
- `AssigneeId` (INT, Nullable, FK -> Users.Id)
- `DueDate` (DATE, Nullable)
- `EstimatedHours` (DECIMAL 6,2, Default 0)
- `CreatedAt` (DATETIME)

### 4.5. Tabel `Notes`
- `Id` (INT, PK, Auto Increment)
- `ProjectId` (INT, Nullable, FK -> Projects.Id)
- `Title` (VARCHAR 200)
- `Content` (LONGTEXT - Markdown format)
- `Category` (ENUM: `Meeting`, `Architecture`, `Guide`, `General`)
- `CreatedByUserId` (INT, FK -> Users.Id)
- `CreatedAt` (DATETIME)
- `UpdatedAt` (DATETIME, Nullable)

### 4.6. Tabel `Timesheets`
- `Id` (INT, PK, Auto Increment)
- `UserId` (INT, FK -> Users.Id)
- `ProjectId` (INT, FK -> Projects.Id)
- `PeriodMonth` (INT - 1..12)
- `PeriodYear` (INT - e.g. 2026)
- `SubmissionType` (ENUM: `InternalDaily`, `ConsultantMonthlyUpload`)
- `UploadedFilePath` (VARCHAR 255, Nullable - path ke file Excel/CSV di `/Uploads/Timesheets/`)
- `OriginalFileName` (VARCHAR 255, Nullable)
- `TotalHours` (DECIMAL 8,2, Default 0)
- `Status` (ENUM: `Draft`, `Submitted`, `Approved`, `Rejected`)
- `ReviewerId` (INT, Nullable, FK -> Users.Id)
- `ReviewNotes` (TEXT, Nullable)
- `SubmittedAt` (DATETIME, Nullable)
- `ReviewedAt` (DATETIME, Nullable)

### 4.7. Tabel `TimesheetEntries`
- `Id` (INT, PK, Auto Increment)
- `TimesheetId` (INT, FK -> Timesheets.Id, On Delete Cascade)
- `Date` (DATE)
- `Hours` (DECIMAL 5,2)
- `TaskId` (INT, Nullable, FK -> Tasks.Id)
- `ActivityDescription` (TEXT)
- `CreatedAt` (DATETIME)

### 4.8. Tabel `Attendances`
- `Id` (INT, PK, Auto Increment)
- `UserId` (INT, FK -> Users.Id)
- `Date` (DATE)
- `ClockInTime` (DATETIME)
- `ClockOutTime` (DATETIME, Nullable)
- `WorkMode` (ENUM: `WFO`, `WFH`)
- `Status` (ENUM: `Present`, `Late`, `Sick`, `Leave`, `Alpha`)
- `LocationNotes` (VARCHAR 200, Nullable)
- `Notes` (TEXT, Nullable)

### 4.9. Tabel `Tickets` (Manajemen Permasalahan & Caretaker)
- `Id` (INT, PK, Auto Increment)
- `TicketNumber` (VARCHAR 50, Unique - misal `TCK-2026-0012`)
- `ProjectId` (INT, FK -> Projects.Id)
- `Title` (VARCHAR 200)
- `Description` (TEXT)
- `Severity` (ENUM: `Low`, `Medium`, `High`, `Critical`)
- `Status` (ENUM: `Open`, `InProgress`, `InReview`, `Resolved`, `Closed`)
- `ReportedByUserId` (INT, FK -> Users.Id)
- `AssignedCaretakerId` (INT, Nullable, FK -> Users.Id)
- `AttachmentUrl` (VARCHAR 255, Nullable)
- `ResolutionNotes` (TEXT, Nullable)
- `CreatedAt` (DATETIME)
- `ResolvedAt` (DATETIME, Nullable)

### 4.10. Tabel `TicketComments`
- `Id` (INT, PK, Auto Increment)
- `TicketId` (INT, FK -> Tickets.Id, On Delete Cascade)
- `UserId` (INT, FK -> Users.Id)
- `Comment` (TEXT)
- `AttachmentUrl` (VARCHAR 255, Nullable)
- `StatusChange` (VARCHAR 50, Nullable)
- `CreatedAt` (DATETIME)

---

## 5. Alur Fungsional Modul Utama

### 5.1. Penerimaan Anggota Baru & Onboarding Screen
1. **Registrasi Mandiri (Self-Registration)**:
   - Calon anggota mengisi form pendaftaran: Nama, Email, Password, Employment Type (`Internal Employee` atau `External Consultant`), Nama Agensi/Perusahaan Asal (jika konsultan), serta Keahlian/Jabatan.
   - Status user ditetapkan `PendingApproval`. User belum dapat login ke dashboard dan melihat halaman notifikasi status verifikasi.
2. **Direct Invitation**:
   - Admin/PM dapat mengundang pengguna langsung dari panel kelola anggota. Email dikirim atau akun dibuat langsung dengan status `Active`.
3. **Persetujuan (Approval Gate)**:
   - Admin/PM menerima daftar permohonan anggota baru.
   - Menggunakan modal konfirmasi **SweetAlert2**, Admin dapat menyetujui (*Approve*) dengan menentukan Role final, atau menolak (*Reject*) dengan alasan penolakan.
4. **Onboarding Screen Wizard**:
   - Saat pengguna berstatus `Active` login pertama kali dan `OnboardingCompleted == false`, sistem otomatis menampilkan **Onboarding Screen Wizard** 3 langkah:
     - *Langkah 1*: Verifikasi Profil & Unggah Foto Avatar.
     - *Langkah 2*: Ringkasan Peran & Proyek yang dialokasikan.
     - *Langkah 3*: Quick Tour modul utama (Tugas, Timesheet, Presensi, dan Tiket Caretaker).
   - Pengguna mengklik "Selesaikan Onboarding", backend memperbarui `OnboardingCompleted = true`, dan mengarahkan pengguna ke Dashboard Utama.

### 5.2. Manajemen Tugas (Tasks)
- **Tampilan Dual**:
  - **Kanban Board**: Kolom interaktif *To Do*, *In Progress*, *In Review*, dan *Done*. Mendukung drag-and-drop status update instan.
  - **List View**: Tampilan tabel ringkas dengan sorting deadline, pencarian nama tugas, dan filter proyek.
- **Komponen Form**:
  - Menggunakan dropdown **Select2** untuk memilih Proyek dan Assignee tim secara searchable.
  - Badge prioritas berwarna: *Urgent* (Merah menyala), *High* (Oranye), *Medium* (Kuning), *Low* (Biru/Slate).

### 5.3. Manajemen Catatan (Notes)
- Menyediakan dokumentasi catatan rapat (*Minutes of Meeting*), panduan arsitektur sistem, dan catatan harian tim.
- Editor teks dengan live preview Markdown (heading, list, checklist, code block).
- Pencarian dan filter berdasarkan kategori (*Meeting*, *Architecture*, *Guide*, *General*) serta pin catatan penting.

### 5.4. Manajemen Timesheet (Dual-Mode)
- **Mode Konsultan (Monthly Upload)**:
  - Tombol *"Unduh Template Excel Resmi"* (`.xlsx` / `.csv`) dengan kolom: Tanggal, Proyek, Uraian Tugas/Deliverable, Jumlah Jam Kerja.
  - Form unggah berkas akhir bulan: Konsultan memilih Bulan & Tahun periode, lalu menyeret berkas Excel/CSV ke zona upload.
  - Backend memvalidasi format, mengekstrak data baris-per-baris, menghitung total jam, dan menyimpannya sebagai `Timesheets` berstatus `Submitted`.
  - PM / Finance meninjau berkas asli dan rincian jam, lalu menyetujui (*Approve*) atau menolak (*Reject*) dengan catatan revisi via SweetAlert2.
- **Mode Internal (Continuous Real-Time Logging)**:
  - Form input aktivitas harian: Tanggal, Proyek, Tugas, Durasi Jam, dan Deskripsi Pekerjaan.
  - Fitur *Live Stopwatch Widget*: Karyawan dapat menekan tombol "Start Timer", memilih tugas yang dikerjakan, dan "Stop Timer" untuk otomatis membukukan jam kerja ke timesheet hari ini.

### 5.5. Manajemen Presensi / Kehadiran (Attendance)
- Widget presensi harian di dashboard:
  - Tombol aksi **Clock-In**: Merekam timestamp masuk, mode kerja (*WFO* di kantor atau *WFH* dari rumah), serta catatan lokasi.
  - Tombol aksi **Clock-Out**: Merekam jam kepulangan, menghitung total durasi kerja hari ini.
  - Indikator status otomatis: *Present (Tepat Waktu)* jika sebelum jam 08:30, *Late (Terlambat)* jika lewat dari jam 08:30.
- Riwayat presensi bulanan dalam bentuk tabel dan kalender absensi.

### 5.6. Manajemen Tiket & Penugasan Caretaker
- **Pelaporan Masalah**:
  - Seluruh anggota tim (baik internal maupun konsultan) dapat melaporkan issue kendala aplikasi/proyek melalui form tiket: Judul, Deskripsi Permasalahan, Proyek terkait, Tingkat Keparahan (*Low*, *Medium*, *High*, *Critical*), serta bukti tangkapan layar (screenshot/lampiran).
- **Ticket Pool (Antrean Terbuka)**:
  - Tiket baru masuk dengan status `Open` ke antrean terbuka.
- **Penugasan Caretaker**:
  - Anggota tim Caretaker dapat mengklaim sendiri tiket (*Pick Ticket*) atau Admin/Lead menugaskan tiket ke anggota caretaker tertentu menggunakan dropdown **Select2**.
  - Status tiket bertransisi: `Open` -> `InProgress` -> `InReview` -> `Resolved` -> `Closed`.
- **Kolaborasi & Solusi**:
  - Setiap tiket memiliki tab komentar untuk diskusi teknis, update perkembangan perbaikan, dan ringkasan solusi sebelum tiket ditutup secara resmi.

### 5.7. Laporan & Analitik (Reports)
- **Dashboard Eksekutif**:
  - Grafik distribusi jam kerja internal vs konsultan.
  - Metrik KPI penyelesaian tugas (*Task Completion Rate*).
  - Statistik tiket insiden: Rata-rata waktu penyelesaian (*Mean Time to Resolution*) dan status per proyek.
  - Rekapitulasi kehadiran karyawan bulanan.
- **Fitur Ekspor**:
  - Tombol ekspor data ke format **Excel (.xlsx)** dan **CSV** untuk kebutuhan audit dan pembayaran (*invoicing* konsultan / penggajian internal).

---

## 6. Desain UI/UX & Integrasi Pustaka

### 6.1. Integrasi SweetAlert2
- **Toast Notifications**:
  ```javascript
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  }).fire({ icon: 'success', title: 'Timesheet berhasil disimpan' });
  ```
- **Modal Konfirmasi Interaktif**:
  ```javascript
  Swal.fire({
    title: 'Setujui Anggota Baru?',
    text: 'Pengguna akan diberikan akses ke proyek terkait.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#ef4444',
    confirmButtonText: 'Ya, Setujui',
    cancelButtonText: 'Batal'
  });
  ```

### 6.2. Integrasi Select2 / Searchable Select
- Komponen dropdown kustom berbasis standar Select2 / React wrapper:
  - Pencarian live instan nama anggota, assignee, proyek, dan prioritas.
  - Tampilan item dengan avatar foto pengguna dan badge peran.
  - Multi-select dukungan tag kategori catatan.

### 6.3. Desain Estetika & Tipografi
- **Font**: *Plus Jakarta Sans* / *Inter* dari Google Fonts.
- **Tema**: Modern Dark & Light Mode dengan variabel CSS semantik (`--bg-primary`, `--card-bg`, `--accent-indigo`, `--text-primary`).
- **Glassmorphism**: Backdrop blur pada sidebar, navbar, dan header kartu dashboard.
- **Mikro-Animasi**: Efek hover interaktif pada kartu tugas kanban, tombol aksi, dan transisi halaman yang mulus.

---

## 7. Rencana Pengujian & Verifikasi

1. **Docker & Database**:
   - Container MySQL 8 berjalan lancar via `docker-compose up -d`.
   - Skrip migrasi EF Core / SQL inisialisasi berhasil membuat tabel dan memuat user default (`admin@projectmgmt.local`).
2. **Backend API**:
   - Autentikasi JWT login dan proteksi token berjalan valid.
   - Endpoint upload timesheet konsultan memvalidasi dan mem-parse berkas Excel/CSV.
   - Endpoint clock-in/clock-out mencegah duplikasi catatan hari yang sama.
   - Siklus tiket (Create -> Pick/Assign -> Comment -> Resolve) teruji dengan benar.
3. **Frontend SPA**:
   - Alur registrasi hybrid dan tampilan approval admin teruji dengan SweetAlert2.
   - Layar onboarding muncul pada login pertama pengguna baru dan terselesaikan.
   - Papan Kanban tugas mendukung drag-and-drop status.
   - Filter dropdown Select2 bekerja responsif.
   - Ekspor laporan dapat diunduh tanpa error.

---

## 8. Dokumen & Persetujuan
Spesifikasi ini menjadi acuan tunggal dalam pembuatan berkas rencana implementasi teknis (*Implementation Plan*).
