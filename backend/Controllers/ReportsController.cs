using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var now = DateTime.UtcNow;
            var currentMonth = now.Month;
            var currentYear = now.Year;
            var today = now.Date;

            var totalProjects = await _context.Projects.CountAsync(p => p.Status == "Active");
            var totalActiveTasks = await _context.Tasks.CountAsync(t => t.Status != "Done");
            var completedTasks = await _context.Tasks.CountAsync(t => t.Status == "Done");
            var openTickets = await _context.Tickets.CountAsync(t => t.Status != "Closed" && t.Status != "Resolved");
            var totalMembers = await _context.Users.CountAsync(u => u.Status == "Active");

            var timesheetsThisMonth = await _context.Timesheets
                .Include(t => t.User)
                .Where(t => t.PeriodMonth == currentMonth && t.PeriodYear == currentYear && t.Status != "Rejected")
                .ToListAsync();

            var consultantHours = timesheetsThisMonth
                .Where(t => t.User != null && t.User.EmploymentType == "Consultant")
                .Sum(t => t.TotalHours);

            var internalHours = timesheetsThisMonth
                .Where(t => t.User != null && t.User.EmploymentType == "Internal")
                .Sum(t => t.TotalHours);

            var todayAttendanceCount = await _context.Attendances
                .CountAsync(a => a.Date == today);

            var stats = new DashboardStatsDto
            {
                TotalProjects = totalProjects,
                TotalActiveTasks = totalActiveTasks,
                CompletedTasks = completedTasks,
                OpenTickets = openTickets,
                TotalMembers = totalMembers,
                TotalLoggedHoursThisMonth = consultantHours + internalHours,
                ConsultantHoursThisMonth = consultantHours,
                InternalHoursThisMonth = internalHours,
                TodayAttendanceCount = todayAttendanceCount
            };

            return Ok(new { success = true, data = stats });
        }

        [HttpGet("executive-analytics")]
        public async Task<IActionResult> GetExecutiveAnalytics()
        {
            var tasks = await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .ToListAsync();

            var projects = await _context.Projects
                .Where(p => p.Status == "Active")
                .Include(p => p.Tasks)
                .ToListAsync();

            var users = await _context.Users
                .Where(u => u.Status == "Active")
                .ToListAsync();

            // 1. Task Status Breakdown for Donut Chart
            var totalTasks = tasks.Count;
            var todoCount = tasks.Count(t => t.Status == "Todo");
            var inProgressCount = tasks.Count(t => t.Status == "InProgress");
            var inReviewCount = tasks.Count(t => t.Status == "InReview");
            var doneCount = tasks.Count(t => t.Status == "Done");

            var statusBreakdown = new[]
            {
                new { Status = "Todo", Label = "To Do", Count = todoCount, Color = "#94a3b8", Percentage = totalTasks > 0 ? Math.Round((double)todoCount / totalTasks * 100, 1) : 0 },
                new { Status = "InProgress", Label = "In Progress", Count = inProgressCount, Color = "#6366f1", Percentage = totalTasks > 0 ? Math.Round((double)inProgressCount / totalTasks * 100, 1) : 0 },
                new { Status = "InReview", Label = "In Review", Count = inReviewCount, Color = "#f59e0b", Percentage = totalTasks > 0 ? Math.Round((double)inReviewCount / totalTasks * 100, 1) : 0 },
                new { Status = "Done", Label = "Done", Count = doneCount, Color = "#10b981", Percentage = totalTasks > 0 ? Math.Round((double)doneCount / totalTasks * 100, 1) : 0 }
            };

            // 2. Team Workload (Top 6 most active members)
            var teamWorkload = users.Select(u => {
                var memberTasks = tasks.Where(t => t.AssigneeId == u.Id).ToList();
                var activeTasks = memberTasks.Count(t => t.Status != "Done");
                var completedMemberTasks = memberTasks.Count(t => t.Status == "Done");
                var totalEstHours = memberTasks.Sum(t => t.EstimatedHours);
                return new
                {
                    UserId = u.Id,
                    FullName = u.FullName,
                    Role = u.Role,
                    AvatarUrl = u.AvatarUrl,
                    EmploymentType = u.EmploymentType,
                    TotalTasks = memberTasks.Count,
                    ActiveTasks = activeTasks,
                    CompletedTasks = completedMemberTasks,
                    TotalEstimatedHours = totalEstHours
                };
            })
            .OrderByDescending(w => w.ActiveTasks)
            .ThenByDescending(w => w.TotalTasks)
            .Take(6)
            .ToList();

            // 3. Project Progress & SDLC Milestones
            var milestones = new[]
            {
                "Inisiasi & Analisis Kebutuhan",
                "Perancangan FSD & TSD",
                "Pengembangan & Integrasi API",
                "Pengujian QA & Security",
                "User Acceptance Testing (UAT)",
                "Deployment & Go-Live"
            };

            var projectProgress = projects.Select(p => {
                var pTasks = tasks.Where(t => t.ProjectId == p.Id).ToList();
                var pTotal = pTasks.Count;
                var pDone = pTasks.Count(t => t.Status == "Done");
                var progressPct = pTotal > 0 ? Math.Round((double)pDone / pTotal * 100, 0) : 0;

                var milestoneBreakdown = milestones.Select((m, idx) => {
                    var mTasks = pTasks.Where(t => t.Milestone != null && t.Milestone.IndexOf(m.Split(' ')[0], StringComparison.OrdinalIgnoreCase) >= 0).ToList();
                    return new {
                        Step = idx + 1,
                        Name = m,
                        ShortName = m.Split('&')[0].Trim(),
                        TaskCount = mTasks.Count,
                        IsCompleted = mTasks.Count > 0 && mTasks.All(t => t.Status == "Done"),
                        IsActive = mTasks.Any(t => t.Status == "InProgress" || t.Status == "Todo")
                    };
                }).ToList();

                return new
                {
                    p.Id,
                    p.Name,
                    p.Code,
                    Color = p.Color ?? "#4f46e5",
                    p.ClientName,
                    p.ProjectType,
                    TotalTasks = pTotal,
                    CompletedTasks = pDone,
                    ProgressPercentage = progressPct,
                    Milestones = milestoneBreakdown
                };
            })
            .OrderByDescending(p => p.TotalTasks)
            .Take(5)
            .ToList();

            // 4. Category Breakdown
            var categoryBreakdown = tasks
                .Where(t => !string.IsNullOrWhiteSpace(t.Category))
                .GroupBy(t => t.Category!)
                .Select(g => new
                {
                    Category = g.Key,
                    Count = g.Count(),
                    Percentage = totalTasks > 0 ? Math.Round((double)g.Count() / totalTasks * 100, 1) : 0
                })
                .OrderByDescending(c => c.Count)
                .Take(6)
                .ToList();

            return Ok(new
            {
                success = true,
                data = new
                {
                    TotalTasks = totalTasks,
                    CompletionRate = totalTasks > 0 ? Math.Round((double)doneCount / totalTasks * 100, 1) : 0,
                    StatusBreakdown = statusBreakdown,
                    TeamWorkload = teamWorkload,
                    ProjectProgress = projectProgress,
                    CategoryBreakdown = categoryBreakdown
                }
            });
        }

        [HttpGet("timesheet-summary")]
        public async Task<IActionResult> GetTimesheetSummary([FromQuery] int? month, [FromQuery] int? year)
        {
            var m = month ?? DateTime.UtcNow.Month;
            var y = year ?? DateTime.UtcNow.Year;

            var list = await _context.Timesheets
                .Include(t => t.User)
                .Include(t => t.Project)
                .Where(t => t.PeriodMonth == m && t.PeriodYear == y)
                .Select(t => new
                {
                    t.Id,
                    UserName = t.User != null ? t.User.FullName : "",
                    UserEmail = t.User != null ? t.User.Email : "",
                    EmploymentType = t.User != null ? t.User.EmploymentType : "",
                    CompanyOrAgency = t.User != null ? t.User.CompanyOrAgency : "-",
                    ProjectName = t.Project != null ? t.Project.Name : "",
                    t.SubmissionType,
                    t.TotalHours,
                    t.Status,
                    t.SubmittedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("export/timesheets.csv")]
        public async Task<IActionResult> ExportTimesheetsCsv([FromQuery] int? month, [FromQuery] int? year)
        {
            var m = month ?? DateTime.UtcNow.Month;
            var y = year ?? DateTime.UtcNow.Year;

            var list = await _context.Timesheets
                .Include(t => t.User)
                .Include(t => t.Project)
                .Where(t => t.PeriodMonth == m && t.PeriodYear == y)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("ID,Nama,Email,Tipe,Agensi,Proyek,Total Jam,Status,Bulan/Tahun,Tanggal Submit");

            foreach (var t in list)
            {
                sb.AppendLine($"{t.Id},\"{t.User?.FullName}\",\"{t.User?.Email}\",{t.User?.EmploymentType},\"{t.User?.CompanyOrAgency ?? "-"}\",\"{t.Project?.Name}\",{t.TotalHours},{t.Status},{t.PeriodMonth}/{t.PeriodYear},{t.SubmittedAt:yyyy-MM-dd}");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"Timesheets_Export_{y}_{m:D2}.csv");
        }

        [HttpGet("export/attendance.csv")]
        public async Task<IActionResult> ExportAttendanceCsv([FromQuery] int? month, [FromQuery] int? year)
        {
            var m = month ?? DateTime.UtcNow.Month;
            var y = year ?? DateTime.UtcNow.Year;

            var list = await _context.Attendances
                .Include(a => a.User)
                .Where(a => a.Date.Month == m && a.Date.Year == y)
                .OrderBy(a => a.Date)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("ID,Nama Karyawan,Tanggal,Clock In,Clock Out,Mode Kerja,Status,Lokasi/Catatan");

            foreach (var a in list)
            {
                sb.AppendLine($"{a.Id},\"{a.User?.FullName}\",{a.Date:yyyy-MM-dd},{a.ClockInTime:HH:mm:ss},{(a.ClockOutTime.HasValue ? a.ClockOutTime.Value.ToString("HH:mm:ss") : "-")},{a.WorkMode},{a.Status},\"{a.LocationNotes ?? a.Notes ?? "-"}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"Attendance_Export_{y}_{m:D2}.csv");
        }
    }
}
