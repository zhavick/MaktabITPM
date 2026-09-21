using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendanceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetTodayStatus()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var attendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

            return Ok(new { success = true, data = attendance != null ? MapToDto(attendance) : null });
        }

        [HttpPost("clock-in")]
        public async Task<IActionResult> ClockIn([FromBody] ClockInDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var existing = await _context.Attendances
                .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

            if (existing != null)
            {
                return BadRequest(new { success = false, message = "Anda sudah melakukan Clock-In untuk hari ini!" });
            }

            var now = DateTime.UtcNow;
            // Office threshold 08:30 AM local time / UTC offset consideration
            var status = now.TimeOfDay > new TimeSpan(8, 30, 0) ? "Late" : "Present";

            var attendance = new Attendance
            {
                UserId = userId,
                Date = today,
                ClockInTime = now,
                WorkMode = dto.WorkMode ?? "WFO",
                Status = status,
                LocationNotes = dto.LocationNotes,
                Notes = dto.Notes
            };

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Clock-In berhasil dicatat pada {now:HH:mm:ss} ({attendance.WorkMode}). Status: {attendance.Status}",
                data = MapToDto(attendance)
            });
        }

        [HttpPost("clock-out")]
        public async Task<IActionResult> ClockOut()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var attendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

            if (attendance == null)
            {
                return BadRequest(new { success = false, message = "Anda belum melakukan Clock-In hari ini." });
            }

            if (attendance.ClockOutTime.HasValue)
            {
                return BadRequest(new { success = false, message = "Anda sudah melakukan Clock-Out hari ini!" });
            }

            attendance.ClockOutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var duration = attendance.ClockOutTime.Value - attendance.ClockInTime;

            return Ok(new
            {
                success = true,
                message = $"Clock-Out berhasil! Total durasi kerja hari ini: {duration.Hours} jam {duration.Minutes} menit.",
                data = MapToDto(attendance)
            });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int? month, [FromQuery] int? year, [FromQuery] int? userId)
        {
            var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(currentUserIdStr, out var currentUserId);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var query = _context.Attendances
                .Include(a => a.User)
                .AsQueryable();

            // Non-admin/managers only see their own attendance
            if (userRole != "Admin" && userRole != "ProjectManager")
            {
                query = query.Where(a => a.UserId == currentUserId);
            }
            else if (userId.HasValue)
            {
                query = query.Where(a => a.UserId == userId.Value);
            }

            if (month.HasValue && year.HasValue)
            {
                query = query.Where(a => a.Date.Month == month.Value && a.Date.Year == year.Value);
            }

            var history = await query
                .OrderByDescending(a => a.Date)
                .Select(a => MapToDto(a))
                .ToListAsync();

            return Ok(new { success = true, data = history });
        }

        private static AttendanceResponseDto MapToDto(Attendance a)
        {
            double? totalHours = null;
            if (a.ClockOutTime.HasValue)
            {
                totalHours = Math.Round((a.ClockOutTime.Value - a.ClockInTime).TotalHours, 2);
            }

            return new AttendanceResponseDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.FullName : "",
                Date = a.Date,
                ClockInTime = a.ClockInTime,
                ClockOutTime = a.ClockOutTime,
                WorkMode = a.WorkMode,
                Status = a.Status,
                LocationNotes = a.LocationNotes,
                Notes = a.Notes,
                TotalWorkingHours = totalHours
            };
        }
    }
}
