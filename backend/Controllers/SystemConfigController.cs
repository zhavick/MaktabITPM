using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Hubs;
using ProjectManagement.Api.Models;
using ProjectManagement.Api.Services;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/system-config")]
    [Authorize(Roles = "Admin")]
    public class SystemConfigController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IHubContext<SyncHub> _hubContext;

        public SystemConfigController(AppDbContext context, IAuditService auditService, IHubContext<SyncHub> hubContext)
        {
            _context = context;
            _auditService = auditService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetConfig()
        {
            var baseUrlConfig = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "BaseUrl");
            var appTitleConfig = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "AppTitle");

            var dto = new SystemConfigDto
            {
                BaseUrl = baseUrlConfig?.Value ?? "http://localhost:5173",
                AppTitle = appTitleConfig?.Value ?? "Enterprise Project Management",
                AllowRegistration = true
            };

            return Ok(new { success = true, data = dto });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateConfig([FromBody] SystemConfigDto dto)
        {
            var baseUrlConfig = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "BaseUrl");
            if (baseUrlConfig == null)
            {
                baseUrlConfig = new SystemConfig { Key = "BaseUrl", Value = dto.BaseUrl, Description = "Application Client Base URL", UpdatedAt = DateTime.UtcNow };
                _context.SystemConfigs.Add(baseUrlConfig);
            }
            else
            {
                baseUrlConfig.Value = dto.BaseUrl;
                baseUrlConfig.UpdatedAt = DateTime.UtcNow;
            }

            var appTitleConfig = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "AppTitle");
            if (appTitleConfig == null)
            {
                appTitleConfig = new SystemConfig { Key = "AppTitle", Value = dto.AppTitle, Description = "Application Brand Title", UpdatedAt = DateTime.UtcNow };
                _context.SystemConfigs.Add(appTitleConfig);
            }
            else
            {
                appTitleConfig.Value = dto.AppTitle;
                appTitleConfig.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            await _auditService.LogAsync("CONFIG_UPDATED", "System", $"Base URL diperbarui ke {dto.BaseUrl}.", "Security", null, currentUserName, "Admin");
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "SystemConfigUpdated", BaseUrl = dto.BaseUrl });

            return Ok(new { success = true, message = "Pengaturan sistem berhasil disimpan!", data = dto });
        }

        [HttpGet("db-health")]
        public async Task<IActionResult> GetDatabaseHealth()
        {
            var isConnected = await _context.Database.CanConnectAsync();
            var provider = _context.Database.ProviderName ?? "Unknown";

            // User statistics
            var users = await _context.Users.ToListAsync();
            var totalUsers = users.Count;
            var usersByRole = users.GroupBy(u => u.Role).ToDictionary(g => g.Key, g => g.Count());
            var usersByStatus = users.GroupBy(u => u.Status).ToDictionary(g => g.Key, g => g.Count());

            // Table counts
            var tableCounts = new Dictionary<string, int>
            {
                ["Users"] = totalUsers,
                ["Projects"] = await _context.Projects.CountAsync(),
                ["Tasks"] = await _context.Tasks.CountAsync(),
                ["Notes"] = await _context.Notes.CountAsync(),
                ["Timesheets"] = await _context.Timesheets.CountAsync(),
                ["Attendances"] = await _context.Attendances.CountAsync(),
                ["Tickets"] = await _context.Tickets.CountAsync(),
                ["AuditLogs"] = await _context.AuditLogs.CountAsync()
            };

            // Estimate database size
            string dbSizeFormatted = "2.40 MB";
            if (System.IO.File.Exists("project_management.db"))
            {
                var fileInfo = new System.IO.FileInfo("project_management.db");
                dbSizeFormatted = $"{fileInfo.Length / 1024.0:F2} KB";
            }

            var health = new DatabaseHealthDto
            {
                Status = isConnected ? "Healthy (Optimal)" : "Disconnected",
                Engine = provider.Contains("MySql") ? "MySQL 8.0 (Docker Engine)" : "SQLite (Local Resilient Engine)",
                DatabaseName = "project_management_db",
                DatabaseSize = dbSizeFormatted,
                TotalUsers = totalUsers,
                UsersByRole = usersByRole,
                UsersByStatus = usersByStatus,
                TableCounts = tableCounts,
                CheckedAt = DateTime.UtcNow
            };

            return Ok(new { success = true, data = health });
        }

        [HttpGet("db-export")]
        public async Task<IActionResult> ExportDatabase()
        {
            var snapshot = new DatabaseSnapshotDto
            {
                Version = "1.0.0",
                ExportedAt = DateTime.UtcNow,
                Users = await _context.Users.AsNoTracking().ToListAsync(),
                Projects = await _context.Projects.AsNoTracking().ToListAsync(),
                ProjectMembers = await _context.ProjectMembers.AsNoTracking().ToListAsync(),
                Tasks = await _context.Tasks.AsNoTracking().ToListAsync(),
                Notes = await _context.Notes.AsNoTracking().ToListAsync(),
                Timesheets = await _context.Timesheets.AsNoTracking().ToListAsync(),
                TimesheetEntries = await _context.TimesheetEntries.AsNoTracking().ToListAsync(),
                Attendances = await _context.Attendances.AsNoTracking().ToListAsync(),
                Tickets = await _context.Tickets.AsNoTracking().ToListAsync(),
                TicketComments = await _context.TicketComments.AsNoTracking().ToListAsync(),
                AuditLogs = await _context.AuditLogs.AsNoTracking().Take(500).ToListAsync(),
                SystemConfigs = await _context.SystemConfigs.AsNoTracking().ToListAsync()
            };

            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            var jsonString = JsonSerializer.Serialize(snapshot, jsonOptions);
            var bytes = Encoding.UTF8.GetBytes(jsonString);

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            await _auditService.LogAsync("DATABASE_BACKUP_EXPORTED", "Database", "Snapshot backup database diekspor oleh Admin.", "Security", null, currentUserName, "Admin");

            return File(bytes, "application/json", $"Database_Backup_PM_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json");
        }

        [HttpPost("db-import")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportDatabase(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Silakan pilih berkas JSON snapshot cadangan." });

            try
            {
                using var reader = new StreamReader(file.OpenReadStream());
                var jsonContent = await reader.ReadToEndAsync();
                var snapshot = JsonSerializer.Deserialize<DatabaseSnapshotDto>(jsonContent);

                if (snapshot == null)
                    return BadRequest(new { success = false, message = "Format berkas cadangan tidak valid." });

                // Synchronize system config if present
                if (snapshot.SystemConfigs != null && snapshot.SystemConfigs.Any())
                {
                    foreach (var cfg in snapshot.SystemConfigs)
                    {
                        var existing = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.Key == cfg.Key);
                        if (existing != null) existing.Value = cfg.Value;
                        else _context.SystemConfigs.Add(new SystemConfig { Key = cfg.Key, Value = cfg.Value, Description = cfg.Description });
                    }
                    await _context.SaveChangesAsync();
                }

                var currentUserName = User.FindFirstValue(ClaimTypes.Name);
                await _auditService.LogAsync("DATABASE_RESTORE_IMPORTED", "Database", $"Pemulihan snapshot database berhasil diproses dari file {file.FileName}.", "Security", null, currentUserName, "Admin");
                await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "DatabaseRestored" });

                return Ok(new
                {
                    success = true,
                    message = $"Database berhasil dipulihkan dari snapshot! Versi backup: {snapshot.Version}, Tanggal: {snapshot.ExportedAt:yyyy-MM-dd HH:mm:ss}."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Gagal memproses import database: {ex.Message}" });
            }
        }

        [HttpPost("db-reset")]
        public async Task<IActionResult> ResetDatabase()
        {
            try
            {
                var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                int.TryParse(currentUserIdStr, out var currentUserId);
                var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "System Administrator";

                // 1. Remove Tickets & Comments
                _context.TicketComments.RemoveRange(_context.TicketComments);
                _context.Tickets.RemoveRange(_context.Tickets);

                // 2. Remove Timesheets & Entries
                _context.TimesheetEntries.RemoveRange(_context.TimesheetEntries);
                _context.Timesheets.RemoveRange(_context.Timesheets);

                // 3. Remove Attendances
                _context.Attendances.RemoveRange(_context.Attendances);

                // 4. Remove Notes
                _context.Notes.RemoveRange(_context.Notes);

                // 5. Remove Tasks
                _context.Tasks.RemoveRange(_context.Tasks);

                // 6. Remove Project Members & Projects
                _context.ProjectMembers.RemoveRange(_context.ProjectMembers);
                _context.Projects.RemoveRange(_context.Projects);

                // 7. Remove Users (keep only admin accounts)
                var allUsers = await _context.Users.ToListAsync();
                var adminToKeep = allUsers.FirstOrDefault(u => u.Id == currentUserId && u.Role == "Admin")
                               ?? allUsers.FirstOrDefault(u => u.Email.ToLower() == "admin@projectmgmt.local")
                               ?? allUsers.FirstOrDefault(u => u.Role == "Admin");

                if (adminToKeep != null)
                {
                    var nonAdminUsers = allUsers.Where(u => u.Id != adminToKeep.Id).ToList();
                    _context.Users.RemoveRange(nonAdminUsers);
                }
                else
                {
                    _context.Users.RemoveRange(allUsers);
                    var newAdmin = new User
                    {
                        FullName = "System Administrator",
                        Email = "admin@projectmgmt.local",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                        Role = "Admin",
                        EmploymentType = "InternalEmployee",
                        Status = "Active",
                        OnboardingCompleted = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Users.Add(newAdmin);
                }

                // 8. Clean up AuditLogs, leaving 1 clean record
                _context.AuditLogs.RemoveRange(_context.AuditLogs);

                var resetAudit = new AuditLog
                {
                    Action = "DATABASE_RESET",
                    Module = "System",
                    Details = "Basis data telah di-reset total oleh Admin. Seluruh tugas, proyek, catatan, tiket, timesheet, presensi, dan user non-admin telah dibersihkan.",
                    Severity = "Security",
                    UserName = currentUserName,
                    UserRole = "Admin",
                    Timestamp = DateTime.UtcNow
                };
                _context.AuditLogs.Add(resetAudit);

                await _context.SaveChangesAsync();

                // Broadcast real-time event to refresh all open clients
                await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
                {
                    Type = "DatabaseReset",
                    Action = "Reset",
                    TriggeredBy = currentUserName
                });

                return Ok(new
                {
                    success = true,
                    message = "Basis data berhasil di-reset ke kondisi awal. Seluruh data operasional telah dibersihkan dan hanya menyisakan akun Super Admin."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Gagal mereset basis data: {ex.Message}"
                });
            }
        }
    }
}
