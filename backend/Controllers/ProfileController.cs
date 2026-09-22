using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Hubs;
using ProjectManagement.Api.Services;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IAuditService _auditService;
        private readonly IHubContext<SyncHub> _hubContext;

        public ProfileController(AppDbContext context, IWebHostEnvironment env, IAuditService auditService, IHubContext<SyncHub> hubContext)
        {
            _context = context;
            _env = env;
            _auditService = auditService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var u = await _context.Users.FindAsync(userId);
            if (u == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

            var dto = new UserFullProfileDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                EmploymentType = u.EmploymentType,
                Status = u.Status,
                CompanyOrAgency = u.CompanyOrAgency,
                HourlyRate = u.HourlyRate,
                AvatarUrl = u.AvatarUrl,
                CoverUrl = u.CoverUrl,
                PhoneNumber = u.PhoneNumber,
                Bio = u.Bio,
                Location = u.Location,
                OnboardingCompleted = u.OnboardingCompleted,
                CreatedAt = u.CreatedAt
            };

            return Ok(new { success = true, data = dto });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var u = await _context.Users.FindAsync(userId);
            if (u == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

            u.FullName = dto.FullName;
            u.PhoneNumber = dto.PhoneNumber;
            u.Bio = dto.Bio;
            u.Location = dto.Location;
            u.CompanyOrAgency = dto.CompanyOrAgency;
            u.HourlyRate = dto.HourlyRate;
            u.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("PROFILE_UPDATED", "Profile", $"User {u.FullName} memperbarui profil pribadi.", "Info", u.Id, u.FullName, u.Role);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "ProfileUpdated", UserId = u.Id, FullName = u.FullName });

            return Ok(new { success = true, message = "Profil berhasil diperbarui!", data = u });
        }

        [HttpPost("avatar")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Berkas foto avatar tidak valid." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var u = await _context.Users.FindAsync(userId);
            if (u == null) return NotFound();

            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp")
                return BadRequest(new { success = false, message = "Hanya berkas gambar (.jpg, .png, .webp) yang diizinkan." });

            var uploadsFolder = Path.Combine(_env.ContentRootPath, "Uploads", "Avatars");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            var uniqueName = $"avatar_{userId}_{Guid.NewGuid()}{ext}";
            var path = Path.Combine(uploadsFolder, uniqueName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            u.AvatarUrl = $"/Uploads/Avatars/{uniqueName}";
            u.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("AVATAR_CHANGED", "Profile", $"User {u.FullName} memperbarui foto profil.", "Info", u.Id, u.FullName, u.Role);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "ProfileUpdated", UserId = u.Id, AvatarUrl = u.AvatarUrl });

            return Ok(new { success = true, message = "Foto profil berhasil diperbarui!", avatarUrl = u.AvatarUrl });
        }

        [HttpPost("cover")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCover(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "Berkas foto cover tidak valid." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var u = await _context.Users.FindAsync(userId);
            if (u == null) return NotFound();

            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp")
                return BadRequest(new { success = false, message = "Hanya berkas gambar (.jpg, .png, .webp) yang diizinkan." });

            var uploadsFolder = Path.Combine(_env.ContentRootPath, "Uploads", "Covers");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            var uniqueName = $"cover_{userId}_{Guid.NewGuid()}{ext}";
            var path = Path.Combine(uploadsFolder, uniqueName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            u.CoverUrl = $"/Uploads/Covers/{uniqueName}";
            u.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("COVER_CHANGED", "Profile", $"User {u.FullName} memperbarui foto cover profil.", "Info", u.Id, u.FullName, u.Role);

            return Ok(new { success = true, message = "Foto cover berhasil diperbarui!", coverUrl = u.CoverUrl });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var u = await _context.Users.FindAsync(userId);
            if (u == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, u.PasswordHash))
            {
                await _auditService.LogAsync("PASSWORD_CHANGE_FAILED", "Security", $"Percobaan ganti password gagal (password lama salah) untuk user {u.Email}.", "Warning", u.Id, u.FullName, u.Role);
                return BadRequest(new { success = false, message = "Password lama yang Anda masukkan tidak sesuai." });
            }

            u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            u.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("PASSWORD_CHANGED", "Security", $"Password berhasil diubah untuk akun {u.Email}.", "Security", u.Id, u.FullName, u.Role);

            return Ok(new { success = true, message = "Password Anda berhasil diperbarui! Silakan gunakan password baru saat login berikutnya." });
        }
    }
}
