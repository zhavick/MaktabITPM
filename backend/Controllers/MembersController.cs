using System;
using System.Linq;
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
    public class MembersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MembersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMembers([FromQuery] string? role, [FromQuery] string? type, [FromQuery] string? search)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(u => u.EmploymentType == type);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search) || (u.CompanyOrAgency != null && u.CompanyOrAgency.Contains(search)));

            var members = await query
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserProfileDto
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
                    OnboardingCompleted = u.OnboardingCompleted,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = members });
        }

        [HttpGet("caretakers")]
        public async Task<IActionResult> GetCaretakers()
        {
            var caretakers = await _context.Users
                .Where(u => u.Status == "Active" && (u.Role == "Caretaker" || u.Role == "Admin" || u.Role == "ProjectManager"))
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.AvatarUrl
                })
                .ToListAsync();

            return Ok(new { success = true, data = caretakers });
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> GetPendingMembers()
        {
            var pending = await _context.Users
                .Where(u => u.Status == "PendingApproval")
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserProfileDto
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
                    OnboardingCompleted = u.OnboardingCompleted,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = pending });
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> ApproveMember(int id, [FromBody] MemberApprovalDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

            user.Status = "Active";
            if (!string.IsNullOrWhiteSpace(dto.AssignedRole))
            {
                user.Role = dto.AssignedRole;
            }
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Pengguna {user.FullName} berhasil disetujui sebagai {user.Role}!" });
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> RejectMember(int id, [FromBody] MemberApprovalDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

            user.Status = "Rejected";
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"Permohonan pendaftaran {user.FullName} telah ditolak." });
        }

        [HttpPost("invite")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> InviteMember([FromBody] MemberInviteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower().Trim());
            if (existing != null)
                return BadRequest(new { success = false, message = "Email sudah terdaftar." });

            var defaultPassword = "Password123!";
            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword),
                Role = dto.Role,
                EmploymentType = dto.EmploymentType,
                CompanyOrAgency = dto.CompanyOrAgency,
                HourlyRate = dto.HourlyRate,
                Status = "Active", // Direct invite is automatically Active
                OnboardingCompleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (dto.ProjectId.HasValue)
            {
                _context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = dto.ProjectId.Value,
                    UserId = user.Id,
                    RoleInProject = dto.Role == "Consultant" ? "Consultant" : "Member",
                    JoinedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                message = $"Undangan berhasil dibuat untuk {user.FullName}. Password sementara: {defaultPassword}",
                data = new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role,
                    DefaultPassword = defaultPassword
                }
            });
        }
    }
}
