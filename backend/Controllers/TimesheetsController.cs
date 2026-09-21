using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Models;
using ProjectManagement.Api.Services;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TimesheetsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITimesheetParserService _parserService;
        private readonly IWebHostEnvironment _env;

        public TimesheetsController(AppDbContext context, ITimesheetParserService parserService, IWebHostEnvironment env)
        {
            _context = context;
            _parserService = parserService;
            _env = env;
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyTimesheets()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var timesheets = await _context.Timesheets
                .Include(ts => ts.Project)
                .Include(ts => ts.Entries)
                .Where(ts => ts.UserId == userId)
                .OrderByDescending(ts => ts.PeriodYear)
                .ThenByDescending(ts => ts.PeriodMonth)
                .Select(ts => MapToDto(ts))
                .ToListAsync();

            return Ok(new { success = true, data = timesheets });
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> GetAll([FromQuery] int? projectId, [FromQuery] string? status, [FromQuery] string? type)
        {
            var query = _context.Timesheets
                .Include(ts => ts.User)
                .Include(ts => ts.Project)
                .Include(ts => ts.Entries)
                .AsQueryable();

            if (projectId.HasValue) query = query.Where(ts => ts.ProjectId == projectId.Value);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(ts => ts.Status == status);
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(ts => ts.SubmissionType == type);

            var list = await query
                .OrderByDescending(ts => ts.PeriodYear)
                .ThenByDescending(ts => ts.PeriodMonth)
                .Select(ts => MapToDto(ts))
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpPost("internal/log")]
        public async Task<IActionResult> LogInternalEntry([FromBody] InternalTimesheetLogDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var month = dto.Date.Month;
            var year = dto.Date.Year;

            // Find or create active internal timesheet for this month
            var timesheet = await _context.Timesheets
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.UserId == userId && t.ProjectId == dto.ProjectId && t.PeriodMonth == month && t.PeriodYear == year && t.SubmissionType == "InternalDaily");

            if (timesheet == null)
            {
                timesheet = new Timesheet
                {
                    UserId = userId,
                    ProjectId = dto.ProjectId,
                    PeriodMonth = month,
                    PeriodYear = year,
                    SubmissionType = "InternalDaily",
                    Status = "Submitted",
                    TotalHours = dto.Hours,
                    SubmittedAt = DateTime.UtcNow
                };
                _context.Timesheets.Add(timesheet);
                await _context.SaveChangesAsync();
            }
            else
            {
                timesheet.TotalHours += dto.Hours;
            }

            var entry = new TimesheetEntry
            {
                TimesheetId = timesheet.Id,
                Date = dto.Date,
                Hours = dto.Hours,
                TaskId = dto.TaskId,
                ActivityDescription = dto.ActivityDescription,
                CreatedAt = DateTime.UtcNow
            };

            _context.TimesheetEntries.Add(entry);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Log aktivitas kerja berhasil disimpan!", data = entry });
        }

        [HttpGet("consultant/template")]
        [AllowAnonymous]
        public IActionResult DownloadTemplate([FromQuery] string format = "csv")
        {
            if (format.ToLower() == "xlsx" || format.ToLower() == "excel")
            {
                var bytes = _parserService.GenerateTemplateExcel();
                return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Template_Timesheet_Konsultan.xlsx");
            }

            var csvBytes = _parserService.GenerateTemplateCsv();
            return File(csvBytes, "text/csv", "Template_Timesheet_Konsultan.csv");
        }

        [HttpPost("consultant/upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadConsultantTimesheet([FromForm] ConsultantUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { success = false, message = "Silakan unggah berkas timesheet (.xlsx, .xls, .csv)." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var ext = Path.GetExtension(dto.File.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls" && ext != ".csv")
                return BadRequest(new { success = false, message = "Hanya berkas Excel (.xlsx, .xls) atau CSV yang diizinkan." });

            var uploadsFolder = Path.Combine(_env.ContentRootPath, "Uploads", "Timesheets");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{userId}_{dto.PeriodYear}_{dto.PeriodMonth}_{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await dto.File.CopyToAsync(fileStream);
            }

            // Create Timesheet record
            var timesheet = new Timesheet
            {
                UserId = userId,
                ProjectId = dto.ProjectId,
                PeriodMonth = dto.PeriodMonth,
                PeriodYear = dto.PeriodYear,
                SubmissionType = "ConsultantMonthlyUpload",
                UploadedFilePath = $"/Uploads/Timesheets/{uniqueFileName}",
                OriginalFileName = dto.File.FileName,
                Status = "Submitted",
                SubmittedAt = DateTime.UtcNow
            };

            _context.Timesheets.Add(timesheet);
            await _context.SaveChangesAsync();

            // Parse entries
            using (var parseStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
            {
                var (entries, totalHours) = _parserService.ParseFile(parseStream, dto.File.FileName, timesheet.Id);
                timesheet.TotalHours = totalHours;
                _context.TimesheetEntries.AddRange(entries);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                message = $"Timesheet bulan {dto.PeriodMonth}/{dto.PeriodYear} berhasil diunggah! Total jam terdeteksi: {timesheet.TotalHours} jam.",
                data = MapToDto(timesheet)
            });
        }

        [HttpPost("{id}/review")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> ReviewTimesheet(int id, [FromBody] TimesheetReviewDto dto)
        {
            var timesheet = await _context.Timesheets.FindAsync(id);
            if (timesheet == null)
                return NotFound(new { success = false, message = "Timesheet tidak ditemukan." });

            var reviewerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(reviewerIdStr, out var reviewerId);

            timesheet.Status = dto.Action == "Approve" ? "Approved" : "Rejected";
            timesheet.ReviewNotes = dto.ReviewNotes;
            timesheet.ReviewerId = reviewerId;
            timesheet.ReviewedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Timesheet berhasil di-{timesheet.Status.ToLower()}!",
                data = timesheet
            });
        }

        private static TimesheetResponseDto MapToDto(Timesheet ts)
        {
            return new TimesheetResponseDto
            {
                Id = ts.Id,
                UserId = ts.UserId,
                UserName = ts.User != null ? ts.User.FullName : "",
                UserEmail = ts.User != null ? ts.User.Email : "",
                EmploymentType = ts.User != null ? ts.User.EmploymentType : "",
                CompanyOrAgency = ts.User != null ? ts.User.CompanyOrAgency : "",
                ProjectId = ts.ProjectId,
                ProjectName = ts.Project != null ? ts.Project.Name : "",
                PeriodMonth = ts.PeriodMonth,
                PeriodYear = ts.PeriodYear,
                SubmissionType = ts.SubmissionType,
                UploadedFilePath = ts.UploadedFilePath,
                OriginalFileName = ts.OriginalFileName,
                TotalHours = ts.TotalHours,
                Status = ts.Status,
                ReviewNotes = ts.ReviewNotes,
                SubmittedAt = ts.SubmittedAt,
                ReviewedAt = ts.ReviewedAt,
                Entries = ts.Entries.Select(e => new TimesheetEntryDto
                {
                    Id = e.Id,
                    Date = e.Date,
                    Hours = e.Hours,
                    TaskId = e.TaskId,
                    ActivityDescription = e.ActivityDescription
                }).ToList()
            };
        }
    }
}
