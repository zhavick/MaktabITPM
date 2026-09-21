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
    public class NotesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? projectId, [FromQuery] string? category, [FromQuery] string? search)
        {
            var query = _context.Notes
                .Include(n => n.Project)
                .Include(n => n.CreatedByUser)
                .AsQueryable();

            if (projectId.HasValue)
                query = query.Where(n => n.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(category) && category != "All")
                query = query.Where(n => n.Category == category);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));

            var notes = await query
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NoteResponseDto
                {
                    Id = n.Id,
                    ProjectId = n.ProjectId,
                    ProjectName = n.Project != null ? n.Project.Name : null,
                    Title = n.Title,
                    Content = n.Content,
                    Category = n.Category,
                    CreatedByUserId = n.CreatedByUserId,
                    CreatedByUserName = n.CreatedByUser != null ? n.CreatedByUser.FullName : "",
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = notes });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateNoteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);

            var note = new Note
            {
                ProjectId = dto.ProjectId,
                Title = dto.Title,
                Content = dto.Content,
                Category = dto.Category ?? "General",
                CreatedByUserId = currentUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Catatan berhasil disimpan!", data = note });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateNoteDto dto)
        {
            var note = await _context.Notes.FindAsync(id);
            if (note == null)
                return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

            note.Title = dto.Title;
            note.Content = dto.Content;
            note.Category = dto.Category;
            note.ProjectId = dto.ProjectId;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Catatan berhasil diperbarui!", data = note });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var note = await _context.Notes.FindAsync(id);
            if (note == null)
                return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Catatan berhasil dihapus." });
        }
    }
}
