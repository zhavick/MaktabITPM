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
