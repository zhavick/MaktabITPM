using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Project> Projects => Set<Project>();
        public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
        public DbSet<TaskItem> Tasks => Set<TaskItem>();
        public DbSet<TaskComment> TaskComments => Set<TaskComment>();
        public DbSet<TaskActivity> TaskActivities => Set<TaskActivity>();
        public DbSet<Note> Notes => Set<Note>();
        public DbSet<Timesheet> Timesheets => Set<Timesheet>();
        public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
        public DbSet<Attendance> Attendances => Set<Attendance>();
        public DbSet<Ticket> Tickets => Set<Ticket>();
        public DbSet<TicketComment> TicketComments => Set<TicketComment>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<SystemConfig> SystemConfigs => Set<SystemConfig>();
        public DbSet<MasterDataItem> MasterDataItems => Set<MasterDataItem>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Project configuration
            modelBuilder.Entity<Project>()
                .HasIndex(p => p.Code)
                .IsUnique();

            modelBuilder.Entity<Project>()
                .HasOne(p => p.CreatedByUser)
                .WithMany()
                .HasForeignKey(p => p.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ProjectMember
            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.User)
                .WithMany()
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // TaskItem
            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.Assignee)
                .WithMany()
                .HasForeignKey(t => t.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.DeletionRequestedBy)
                .WithMany()
                .HasForeignKey(t => t.DeletionRequestedById)
                .OnDelete(DeleteBehavior.SetNull);

            // TaskComment
            modelBuilder.Entity<TaskComment>()
                .HasOne(tc => tc.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(tc => tc.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskComment>()
                .HasOne(tc => tc.User)
                .WithMany()
                .HasForeignKey(tc => tc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // TaskActivity
            modelBuilder.Entity<TaskActivity>()
                .HasOne(ta => ta.Task)
                .WithMany(t => t.Activities)
                .HasForeignKey(ta => ta.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskActivity>()
                .HasOne(ta => ta.User)
                .WithMany()
                .HasForeignKey(ta => ta.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // Note
            modelBuilder.Entity<Note>()
                .HasOne(n => n.Project)
                .WithMany(p => p.Notes)
                .HasForeignKey(n => n.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Note>()
                .HasOne(n => n.CreatedByUser)
                .WithMany()
                .HasForeignKey(n => n.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Timesheet
            modelBuilder.Entity<Timesheet>()
                .HasOne(ts => ts.User)
                .WithMany()
                .HasForeignKey(ts => ts.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Timesheet>()
                .HasOne(ts => ts.Project)
                .WithMany()
                .HasForeignKey(ts => ts.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Timesheet>()
                .HasOne(ts => ts.Reviewer)
                .WithMany()
                .HasForeignKey(ts => ts.ReviewerId)
                .OnDelete(DeleteBehavior.SetNull);

            // TimesheetEntry
            modelBuilder.Entity<TimesheetEntry>()
                .HasOne(tse => tse.Timesheet)
                .WithMany(ts => ts.Entries)
                .HasForeignKey(tse => tse.TimesheetId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TimesheetEntry>()
                .HasOne(tse => tse.Task)
                .WithMany()
                .HasForeignKey(tse => tse.TaskId)
                .OnDelete(DeleteBehavior.SetNull);

            // Attendance
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ticket
            modelBuilder.Entity<Ticket>()
                .HasIndex(t => t.TicketNumber)
                .IsUnique();

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Tickets)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.ReportedByUser)
                .WithMany()
                .HasForeignKey(t => t.ReportedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.AssignedCaretaker)
                .WithMany()
                .HasForeignKey(t => t.AssignedCaretakerId)
                .OnDelete(DeleteBehavior.SetNull);

            // TicketComment
            modelBuilder.Entity<TicketComment>()
                .HasOne(tc => tc.Ticket)
                .WithMany(t => t.Comments)
                .HasForeignKey(tc => tc.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TicketComment>()
                .HasOne(tc => tc.User)
                .WithMany()
                .HasForeignKey(tc => tc.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }

        public static void SeedData(AppDbContext context)
        {
            if (context.Users.Any()) return;

            string hashedPassword = BCrypt.Net.BCrypt.HashPassword("Admin@123");

            // Seed Users
            var admin = new User
            {
                FullName = "System Administrator",
                Email = "admin@projectmgmt.local",
                PasswordHash = hashedPassword,
                Role = "Admin",
                EmploymentType = "Internal",
                Status = "Active",
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            };

            var pm = new User
            {
                FullName = "Budi Pratama (Project Manager)",
                Email = "pm@projectmgmt.local",
                PasswordHash = hashedPassword,
                Role = "ProjectManager",
                EmploymentType = "Internal",
                Status = "Active",
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            };

            var caretaker = new User
            {
                FullName = "Rian Hidayat (Lead Caretaker)",
                Email = "caretaker@projectmgmt.local",
                PasswordHash = hashedPassword,
                Role = "Caretaker",
                EmploymentType = "Internal",
                Status = "Active",
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            };

            var employee = new User
            {
                FullName = "Siti Rahma (Frontend Engineer)",
                Email = "employee@projectmgmt.local",
                PasswordHash = hashedPassword,
                Role = "InternalEmployee",
                EmploymentType = "Internal",
                Status = "Active",
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            };

            var consultant = new User
            {
                FullName = "Michael Santoso (Cloud Architect Consultant)",
                Email = "consultant@external.com",
                PasswordHash = hashedPassword,
                Role = "Consultant",
                EmploymentType = "Consultant",
                CompanyOrAgency = "PT Mitra Konsultan Digital",
                HourlyRate = 250000.00m,
                Status = "Active",
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };

            var pendingUser = new User
            {
                FullName = "Agus Prasetyo (Calon Konsultan)",
                Email = "agus@mitrabaru.com",
                PasswordHash = hashedPassword,
                Role = "Consultant",
                EmploymentType = "Consultant",
                CompanyOrAgency = "CV Solusi Bersama",
                Status = "PendingApproval",
                OnboardingCompleted = false,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            };

            context.Users.AddRange(admin, pm, caretaker, employee, consultant, pendingUser);
            context.SaveChanges();

            // Seed Projects
            var project1 = new Project
            {
                Name = "Core Enterprise ERP Modernization",
                Code = "PRJ-ERP-01",
                Description = "Transformasi sistem ERP legacy ke microservices dan cloud native infrastructure.",
                ClientName = "PT Nusantara Korporat Tbk",
                StartDate = DateTime.UtcNow.AddDays(-30),
                EndDate = DateTime.UtcNow.AddDays(150),
                Status = "Active",
                Budget = 750000000.00m,
                CreatedByUserId = admin.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            };

            var project2 = new Project
            {
                Name = "Mobile Customer Portal App",
                Code = "PRJ-MOB-02",
                Description = "Aplikasi customer-facing iOS & Android untuk layanan transaksi real-time.",
                ClientName = "Bank Mitra Finansial",
                StartDate = DateTime.UtcNow.AddDays(-15),
                EndDate = DateTime.UtcNow.AddDays(90),
                Status = "Active",
                Budget = 420000000.00m,
                CreatedByUserId = pm.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            };

            context.Projects.AddRange(project1, project2);
            context.SaveChanges();

            // Seed Project Members
            context.ProjectMembers.AddRange(
                new ProjectMember { ProjectId = project1.Id, UserId = pm.Id, RoleInProject = "Manager" },
                new ProjectMember { ProjectId = project1.Id, UserId = caretaker.Id, RoleInProject = "CaretakerLead" },
                new ProjectMember { ProjectId = project1.Id, UserId = employee.Id, RoleInProject = "Developer" },
                new ProjectMember { ProjectId = project1.Id, UserId = consultant.Id, RoleInProject = "Consultant" },
                new ProjectMember { ProjectId = project2.Id, UserId = pm.Id, RoleInProject = "Manager" },
                new ProjectMember { ProjectId = project2.Id, UserId = employee.Id, RoleInProject = "Developer" }
            );
            context.SaveChanges();

            // Seed Tasks
            var task1 = new TaskItem
            {
                ProjectId = project1.Id,
                Title = "Setup Database Sharding Architecture",
                Description = "Merancang skema partisi dan sharding database MySQL untuk beban tinggi.",
                Status = "InProgress",
                Priority = "High",
                AssigneeId = consultant.Id,
                DueDate = DateTime.UtcNow.AddDays(5),
                EstimatedHours = 24.0m
            };

            var task2 = new TaskItem
            {
                ProjectId = project1.Id,
                Title = "Slicing UI Dashboard Kanban dan Timesheet",
                Description = "Implementasi komponen UI interaktif React + SweetAlert2 dan Select2.",
                Status = "Done",
                Priority = "Medium",
                AssigneeId = employee.Id,
                DueDate = DateTime.UtcNow.AddDays(-2),
                EstimatedHours = 16.0m
            };

            var task3 = new TaskItem
            {
                ProjectId = project1.Id,
                Title = "Implementasi JWT Auth & Hybrid Onboarding Flow",
                Description = "Membuat endpoint registrasi mandiri, persetujuan admin, dan wizard onboarding.",
                Status = "Done",
                Priority = "Urgent",
                AssigneeId = employee.Id,
                DueDate = DateTime.UtcNow.AddDays(-1),
                EstimatedHours = 20.0m
            };

            var task4 = new TaskItem
            {
                ProjectId = project1.Id,
                Title = "Integrasi Modul Tiket Caretaker & Notifikasi SLA",
                Description = "Membangun open ticket pool antrean masalah proyek dan routing ke tim caretaker.",
                Status = "InReview",
                Priority = "High",
                AssigneeId = caretaker.Id,
                DueDate = DateTime.UtcNow.AddDays(3),
                EstimatedHours = 18.0m
            };

            var task5 = new TaskItem
            {
                ProjectId = project1.Id,
                Title = "Pengujian Load Test dan Security Audit",
                Description = "Menjalankan stress test OWASP ZAP dan penetrasi API endpoint.",
                Status = "Todo",
                Priority = "Medium",
                AssigneeId = employee.Id,
                DueDate = DateTime.UtcNow.AddDays(12),
                EstimatedHours = 12.0m
            };

            context.Tasks.AddRange(task1, task2, task3, task4, task5);
            context.SaveChanges();

            // Seed Notes
            context.Notes.AddRange(
                new Note
                {
                    ProjectId = project1.Id,
                    Title = "Kickoff Meeting & Roadmap Deliverable",
                    Content = "### Rangkuman Rapat Kickoff\n\n- Scope: Modernisasi core ERP.\n- Jadwal rilis fase 1: Q4 2026.\n- Konsultan bertanggung jawab atas arsitektur data.\n- Internal mengawal frontend dan backend API.",
                    Category = "Meeting",
                    CreatedByUserId = pm.Id
                },
                new Note
                {
                    ProjectId = project1.Id,
                    Title = "Arsitektur Layanan & Standar Penamaan API",
                    Content = "### Pedoman Teknis\n\n1. Seluruh endpoint menggunakan prefix `/api/`.\n2. Header request wajib menyertakan `Authorization: Bearer <token>`.\n3. Format respons seragam: `{ success: bool, data: any, message: string }`.",
                    Category = "Architecture",
                    CreatedByUserId = caretaker.Id
                }
            );
            context.SaveChanges();

            // Seed Tickets
            var ticket1 = new Ticket
            {
                TicketNumber = "TCK-2026-0001",
                ProjectId = project1.Id,
                Title = "Koneksi Redis Cache Timeout pada Environment Staging",
                Description = "Layanan cache sering terputus saat request throughput melebihi 1500 req/sec.",
                Severity = "Critical",
                Status = "InProgress",
                ReportedByUserId = employee.Id,
                AssignedCaretakerId = caretaker.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };

            var ticket2 = new Ticket
            {
                TicketNumber = "TCK-2026-0002",
                ProjectId = project1.Id,
                Title = "Formula Perhitungan PPN 12% pada Modul Faktur Pajak",
                Description = "Ada selisih pembulatan desimal saat mencetak invoice gabungan akhir bulan.",
                Severity = "High",
                Status = "Open",
                ReportedByUserId = consultant.Id,
                AssignedCaretakerId = null, // In Open Ticket Pool
                CreatedAt = DateTime.UtcNow.AddHours(-6)
            };

            context.Tickets.AddRange(ticket1, ticket2);
            context.SaveChanges();

            context.TicketComments.Add(new TicketComment
            {
                TicketId = ticket1.Id,
                UserId = caretaker.Id,
                Comment = "Saya sedang memeriksa file konfigurasi keep-alive pool di server staging.",
                StatusChange = "InProgress",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });

            // Seed sample Attendance
            context.Attendances.Add(new Attendance
            {
                UserId = employee.Id,
                Date = DateTime.UtcNow.Date,
                ClockInTime = DateTime.UtcNow.Date.AddHours(8).AddMinutes(15),
                WorkMode = "WFO",
                Status = "Present",
                LocationNotes = "Kantor Pusat Jakarta Lt. 8"
            });

            context.SaveChanges();
            SeedMasterData(context);
        }

        public static void SeedMasterData(AppDbContext context)
        {
            if (context.MasterDataItems.Any()) return;

            var masterList = new List<MasterDataItem>
            {
                // Kategori (Category)
                new MasterDataItem { Type = "Category", Code = "ENHANCEMENT", Name = "Enhancement", Description = "Pengembangan dan penambahan fitur baru pada sistem", BadgeColor = "#6366f1", SortOrder = 1 },
                new MasterDataItem { Type = "Category", Code = "NEW_APPLICATION", Name = "New Application", Description = "Pembangunan aplikasi baru dari awal", BadgeColor = "#3b82f6", SortOrder = 2 },
                new MasterDataItem { Type = "Category", Code = "BUG", Name = "Bug Fixing", Description = "Perbaikan kendala atau galat fungsional sistem", BadgeColor = "#ef4444", SortOrder = 3 },
                new MasterDataItem { Type = "Category", Code = "MAINTENANCE", Name = "Maintenance", Description = "Pemeliharaan rutin, refactoring, dan optimasi", BadgeColor = "#f59e0b", SortOrder = 4 },
                new MasterDataItem { Type = "Category", Code = "MIGRATION", Name = "Migration", Description = "Migrasi data, API, atau platform arsitektur", BadgeColor = "#8b5cf6", SortOrder = 5 },
                new MasterDataItem { Type = "Category", Code = "DOKUMEN", Name = "Dokumentasi", Description = "Pembuatan dokumen BRD, FSD, TSD, dan panduan", BadgeColor = "#10b981", SortOrder = 6 },
                new MasterDataItem { Type = "Category", Code = "DATABASE", Name = "Database", Description = "Skema database, query tuning, dan indexing", BadgeColor = "#06b6d4", SortOrder = 7 },
                new MasterDataItem { Type = "Category", Code = "BACKEND", Name = "Backend", Description = "Pengembangan REST API dan logika bisnis", BadgeColor = "#ec4899", SortOrder = 8 },
                new MasterDataItem { Type = "Category", Code = "FRONTEND", Name = "Frontend", Description = "Antarmuka pengguna, komponen, dan interaktivitas", BadgeColor = "#14b8a6", SortOrder = 9 },
                new MasterDataItem { Type = "Category", Code = "TESTING", Name = "Testing & QA", Description = "Pengujian unit, integrasi, dan UAT", BadgeColor = "#84cc16", SortOrder = 10 },

                // Prioritas (Priority)
                new MasterDataItem { Type = "Priority", Code = "CRITICAL", Name = "Critical", Description = "Dampak fatal atau blocker produksi", BadgeColor = "#ef4444", SortOrder = 1 },
                new MasterDataItem { Type = "Priority", Code = "HIGH", Name = "High", Description = "Prioritas tinggi yang perlu segera ditindaklanjuti", BadgeColor = "#f97316", SortOrder = 2 },
                new MasterDataItem { Type = "Priority", Code = "MEDIUM", Name = "Medium", Description = "Prioritas normal dalam alur kerja reguler", BadgeColor = "#3b82f6", SortOrder = 3 },
                new MasterDataItem { Type = "Priority", Code = "LOW", Name = "Low", Description = "Prioritas rendah / perbaikan minor", BadgeColor = "#64748b", SortOrder = 4 },

                // Milestone SDLC
                new MasterDataItem { Type = "Milestone", Code = "M1-ANALYSIS", Name = "Inisiasi & Analisis Kebutuhan", Description = "Tahap penelaahan ruang lingkup dan spesifikasi BRD", BadgeColor = "#6366f1", SortOrder = 1 },
                new MasterDataItem { Type = "Milestone", Code = "M2-DESIGN", Name = "Perancangan FSD & TSD", Description = "Penyusunan arsitektur sistem dan desain API", BadgeColor = "#8b5cf6", SortOrder = 2 },
                new MasterDataItem { Type = "Milestone", Code = "M3-DEV", Name = "Pengembangan & Integrasi API", Description = "Tahap coding modul backend dan frontend", BadgeColor = "#3b82f6", SortOrder = 3 },
                new MasterDataItem { Type = "Milestone", Code = "M4-QA", Name = "Pengujian QA & Security", Description = "Verifikasi pengujian sistem dan uji penetrasi", BadgeColor = "#f59e0b", SortOrder = 4 },
                new MasterDataItem { Type = "Milestone", Code = "M5-UAT", Name = "User Acceptance Testing (UAT)", Description = "Uji coba dan penandatanganan BA UAT oleh klien", BadgeColor = "#10b981", SortOrder = 5 },
                new MasterDataItem { Type = "Milestone", Code = "M6-GOLIVE", Name = "Deployment & Go-Live", Description = "Peluncuran resmi ke lingkungan produksi", BadgeColor = "#06b6d4", SortOrder = 6 },

                // Jenis User (User Types / Roles)
                new MasterDataItem { Type = "UserType", Code = "ADMIN", Name = "System Administrator", Description = "Akses administratif penuh ke seluruh modul sistem", BadgeColor = "#ef4444", SortOrder = 1 },
                new MasterDataItem { Type = "UserType", Code = "PM", Name = "Project Manager", Description = "Pengelolaan proyek, penugasan tugas, review timesheet", BadgeColor = "#8b5cf6", SortOrder = 2 },
                new MasterDataItem { Type = "UserType", Code = "CARETAKER", Name = "Caretaker Lead", Description = "Pemelihara stabilitas aplikasi dan tim resolver tiket", BadgeColor = "#f59e0b", SortOrder = 3 },
                new MasterDataItem { Type = "UserType", Code = "EMPLOYEE", Name = "Internal Employee", Description = "Karyawan teknis internal dengan pencatatan log harian", BadgeColor = "#3b82f6", SortOrder = 4 },
                new MasterDataItem { Type = "UserType", Code = "CONSULTANT", Name = "External Consultant", Description = "Konsultan mitra spesialis dengan timesheet bulanan", BadgeColor = "#10b981", SortOrder = 5 },

                // Tipe Project (Project Types)
                new MasterDataItem { Type = "ProjectType", Code = "NEW_APP", Name = "New Application Development", Description = "Pembangunan sistem aplikasi baru dari tahap inisiasi", BadgeColor = "#3b82f6", SortOrder = 1 },
                new MasterDataItem { Type = "ProjectType", Code = "ENHANCE", Name = "Enhancement & Change Request", Description = "Penambahan kapabilitas fitur baru pada sistem yang berjalan", BadgeColor = "#6366f1", SortOrder = 2 },
                new MasterDataItem { Type = "ProjectType", Code = "MANAGE_SVC", Name = "Managed Service & Support", Description = "Layanan pemeliharaan operasional berkesinambungan", BadgeColor = "#10b981", SortOrder = 3 },
                new MasterDataItem { Type = "ProjectType", Code = "INTEGRATION", Name = "API & System Integration", Description = "Koneksi middleware, pertukaran data, dan integrasi API pihak ketiga", BadgeColor = "#f59e0b", SortOrder = 4 },
                new MasterDataItem { Type = "ProjectType", Code = "CLOUD_INFRA", Name = "Cloud & Infrastructure Modernization", Description = "Migrasi cloud, dockerisasi, dan optimasi arsitektur DevOps", BadgeColor = "#06b6d4", SortOrder = 5 },
                new MasterDataItem { Type = "ProjectType", Code = "RND", Name = "Research & Prototyping (R&D)", Description = "Riset eksploratif, PoC inovasi, dan teknologi baru", BadgeColor = "#ec4899", SortOrder = 6 }
            };

            context.MasterDataItems.AddRange(masterList);
            context.SaveChanges();
        }
    }
}
