using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public class AuditLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuditLogsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] string? module,
            [FromQuery] string? userName,
            [FromQuery] string? action,
            [FromQuery] string? severity,
            [FromQuery] string? search,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int limit = 150)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(module) && module != "All")
                query = query.Where(a => a.Module == module);

            if (!string.IsNullOrWhiteSpace(userName) && userName != "All")
                query = query.Where(a => a.UserName == userName);

            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(a => a.Action.Contains(action));

            if (!string.IsNullOrWhiteSpace(severity) && severity != "All")
                query = query.Where(a => a.Severity == severity);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(a => a.UserName.Contains(search) || a.Details.Contains(search) || a.Action.Contains(search));

            if (startDate.HasValue)
                query = query.Where(a => a.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(a => a.Timestamp <= endDate.Value);

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Take(limit)
                .ToListAsync();

            return Ok(new { success = true, data = logs });
        }

        [HttpGet("trend")]
        public async Task<IActionResult> GetTrend(
            [FromQuery] string? module,
            [FromQuery] string? userName,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(module) && module != "All")
                query = query.Where(a => a.Module == module);

            if (!string.IsNullOrWhiteSpace(userName) && userName != "All")
                query = query.Where(a => a.UserName == userName);

            var start = startDate ?? DateTime.UtcNow.Date.AddDays(-13);
            var end = endDate ?? DateTime.UtcNow;

            query = query.Where(a => a.Timestamp >= start && a.Timestamp <= end);

            var rawLogs = await query
                .Select(a => new { a.Timestamp, a.Module })
                .ToListAsync();

            var trend = rawLogs
                .GroupBy(a => a.Timestamp.ToString("yyyy-MM-dd"))
                .Select(g => new
                {
                    date = g.Key,
                    count = g.Count(),
                    topModule = g.GroupBy(x => x.Module)
                                 .OrderByDescending(x => x.Count())
                                 .Select(x => x.Key)
                                 .FirstOrDefault() ?? "General"
                })
                .OrderBy(x => x.date)
                .ToList();

            return Ok(new { success = true, data = trend });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetDistinctUsers()
        {
            var users = await _context.AuditLogs
                .Where(a => !string.IsNullOrEmpty(a.UserName))
                .Select(a => a.UserName)
                .Distinct()
                .OrderBy(u => u)
                .ToListAsync();

            return Ok(new { success = true, data = users });
        }
    }
}
