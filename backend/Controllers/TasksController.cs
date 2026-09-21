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
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? projectId, [FromQuery] string? status, [FromQuery] int? assigneeId)
        {
            var query = _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .AsQueryable();

            if (projectId.HasValue)
                query = query.Where(t => t.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (assigneeId.HasValue)
                query = query.Where(t => t.AssigneeId == assigneeId.Value);

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponseDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "",
                    ProjectCode = t.Project != null ? t.Project.Code : "",
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    AssigneeId = t.AssigneeId,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                    AssigneeAvatar = t.Assignee != null ? t.Assignee.AvatarUrl : null,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = tasks });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var task = new TaskItem
            {
                ProjectId = dto.ProjectId,
                Title = dto.Title,
                Description = dto.Description,
                Status = dto.Status ?? "Todo",
                Priority = dto.Priority ?? "Medium",
                AssigneeId = dto.AssigneeId,
                DueDate = dto.DueDate,
                EstimatedHours = dto.EstimatedHours,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Tugas berhasil dibuat!", data = task });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            task.Status = dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Status tugas berhasil diperbarui!", data = task });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.ProjectId = dto.ProjectId;
            task.Status = dto.Status;
            task.Priority = dto.Priority;
            task.AssigneeId = dto.AssigneeId;
            task.DueDate = dto.DueDate;
            task.EstimatedHours = dto.EstimatedHours;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Tugas berhasil diperbarui!", data = task });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Tugas berhasil dihapus." });
        }
    }
}
