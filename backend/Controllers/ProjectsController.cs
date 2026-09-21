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
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProjectsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var projects = await _context.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Tasks)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new ProjectResponseDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Code = p.Code,
                    Description = p.Description,
                    ClientName = p.ClientName,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Status = p.Status,
                    Budget = p.Budget,
                    TotalTasks = p.Tasks.Count,
                    CompletedTasks = p.Tasks.Count(t => t.Status == "Done"),
                    MemberCount = p.Members.Count,
                    CreatedAt = p.CreatedAt,
                    Members = p.Members.Select(m => new ProjectMemberDto
                    {
                        UserId = m.UserId,
                        FullName = m.User != null ? m.User.FullName : "",
                        Email = m.User != null ? m.User.Email : "",
                        Role = m.User != null ? m.User.Role : "",
                        EmploymentType = m.User != null ? m.User.EmploymentType : "",
                        RoleInProject = m.RoleInProject
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new { success = true, data = projects });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var p = await _context.Projects
                .Include(x => x.Members)
                    .ThenInclude(m => m.User)
                .Include(x => x.Tasks)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (p == null)
                return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

            var result = new ProjectResponseDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                Description = p.Description,
                ClientName = p.ClientName,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                Status = p.Status,
                Budget = p.Budget,
                TotalTasks = p.Tasks.Count,
                CompletedTasks = p.Tasks.Count(t => t.Status == "Done"),
                MemberCount = p.Members.Count,
                CreatedAt = p.CreatedAt,
                Members = p.Members.Select(m => new ProjectMemberDto
                {
                    UserId = m.UserId,
                    FullName = m.User != null ? m.User.FullName : "",
                    Email = m.User != null ? m.User.Email : "",
                    Role = m.User != null ? m.User.Role : "",
                    EmploymentType = m.User != null ? m.User.EmploymentType : "",
                    RoleInProject = m.RoleInProject
                }).ToList()
            };

            return Ok(new { success = true, data = result });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);

            var project = new Project
            {
                Name = dto.Name,
                Code = dto.Code.ToUpper(),
                Description = dto.Description,
                ClientName = dto.ClientName,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Budget = dto.Budget,
                CreatedByUserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            if (dto.MemberUserIds != null && dto.MemberUserIds.Any())
            {
                foreach (var mId in dto.MemberUserIds.Distinct())
                {
                    _context.ProjectMembers.Add(new ProjectMember
                    {
                        ProjectId = project.Id,
                        UserId = mId,
                        RoleInProject = "Member",
                        JoinedAt = DateTime.UtcNow
                    });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, message = "Proyek baru berhasil dibuat!", data = project });
        }
    }
}
