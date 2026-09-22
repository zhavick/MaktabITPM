using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Hubs;
using ProjectManagement.Api.Models;
using ProjectManagement.Api.Services;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TicketsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<SyncHub> _hubContext;
        private readonly IAuditService _auditService;

        public TicketsController(AppDbContext context, IHubContext<SyncHub> hubContext, IAuditService auditService)
        {
            _context = context;
            _hubContext = hubContext;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? projectId, 
            [FromQuery] string? status, 
            [FromQuery] string? severity, 
            [FromQuery] bool? unassignedOnly,
            [FromQuery] bool? myAssignedOnly)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);

            var query = _context.Tickets
                .Include(t => t.Project)
                .Include(t => t.ReportedByUser)
                .Include(t => t.AssignedCaretaker)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.User)
                .AsQueryable();

            if (projectId.HasValue)
                query = query.Where(t => t.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
                query = query.Where(t => t.Status == status);

            if (!string.IsNullOrWhiteSpace(severity) && severity != "All")
                query = query.Where(t => t.Severity == severity);

            if (unassignedOnly == true)
                query = query.Where(t => t.AssignedCaretakerId == null);

            if (myAssignedOnly == true)
                query = query.Where(t => t.AssignedCaretakerId == currentUserId);

            var list = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => MapToDto(t))
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var t = await _context.Tickets
                .Include(x => x.Project)
                .Include(x => x.ReportedByUser)
                .Include(x => x.AssignedCaretaker)
                .Include(x => x.Comments)
                    .ThenInclude(c => c.User)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (t == null)
                return NotFound(new { success = false, message = "Tiket tidak ditemukan." });

            return Ok(new { success = true, data = MapToDto(t) });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTicketDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);

            var countThisYear = await _context.Tickets.CountAsync(t => t.CreatedAt.Year == DateTime.UtcNow.Year) + 1;
            var ticketNumber = $"TCK-{DateTime.UtcNow.Year}-{countThisYear:D4}";

            var ticket = new Ticket
            {
                TicketNumber = ticketNumber,
                ProjectId = dto.ProjectId,
                Title = dto.Title,
                Description = dto.Description,
                Severity = dto.Severity ?? "Medium",
                Category = dto.Category,
                Status = "Open",
                ReportedByUserId = currentUserId,
                AttachmentUrl = dto.AttachmentUrl,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TICKET_CREATED", "Tickets", $"Tiket insiden #{ticket.TicketNumber} '{ticket.Title}' dilaporkan.", "Warning", currentUserId, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TicketCreated",
                TicketNumber = ticket.TicketNumber,
                Title = ticket.Title,
                Severity = ticket.Severity,
                ReportedBy = currentUserName
            });

            return Ok(new
            {
                success = true,
                message = $"Tiket masalah {ticket.TicketNumber} berhasil dilaporkan ke antrean tim Caretaker!",
                data = MapToDto(ticket)
            });
        }

        [HttpPost("{id}/assign")]
        public async Task<IActionResult> AssignCaretaker(int id, [FromBody] AssignTicketDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound(new { success = false, message = "Tiket tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);

            var targetCaretakerId = dto.CaretakerUserId ?? currentUserId;
            ticket.AssignedCaretakerId = targetCaretakerId;
            if (ticket.Status == "Open")
            {
                ticket.Status = "InProgress";
            }

            var caretakerUser = await _context.Users.FindAsync(targetCaretakerId);

            _context.TicketComments.Add(new TicketComment
            {
                TicketId = ticket.Id,
                UserId = currentUserId,
                Comment = $"Tiket diklaim/ditugaskan kepada Caretaker: {caretakerUser?.FullName ?? "Caretaker Member"}",
                StatusChange = ticket.Status,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TICKET_ASSIGNED", "Tickets", $"Tiket #{ticket.TicketNumber} ditugaskan ke {caretakerUser?.FullName}.", "Info", currentUserId, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TicketUpdated",
                TicketNumber = ticket.TicketNumber,
                Status = ticket.Status,
                AssignedTo = caretakerUser?.FullName,
                Action = "Assigned"
            });

            return Ok(new
            {
                success = true,
                message = $"Tiket berhasil ditugaskan ke {caretakerUser?.FullName ?? "Caretaker"}!",
                data = ticket
            });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTicketStatusDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound(new { success = false, message = "Tiket tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);

            var oldStatus = ticket.Status;
            ticket.Status = dto.Status;

            if (!string.IsNullOrWhiteSpace(dto.ResolutionNotes))
            {
                ticket.ResolutionNotes = dto.ResolutionNotes;
            }

            if (dto.Status == "Resolved" || dto.Status == "Closed")
            {
                ticket.ResolvedAt = DateTime.UtcNow;
            }

            _context.TicketComments.Add(new TicketComment
            {
                TicketId = ticket.Id,
                UserId = currentUserId,
                Comment = $"Status tiket diubah dari {oldStatus} menjadi {ticket.Status}. {dto.ResolutionNotes}",
                StatusChange = ticket.Status,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TICKET_STATUS_CHANGED", "Tickets", $"Status tiket #{ticket.TicketNumber} diubah ke {ticket.Status}.", "Info", currentUserId, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TicketUpdated",
                TicketNumber = ticket.TicketNumber,
                Status = ticket.Status,
                Action = "StatusChanged",
                UpdatedBy = currentUserName
            });

            return Ok(new { success = true, message = $"Status tiket berhasil diubah menjadi {ticket.Status}!", data = ticket });
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromBody] AddTicketCommentDto dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound(new { success = false, message = "Tiket tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);

            var comment = new TicketComment
            {
                TicketId = id,
                UserId = currentUserId,
                Comment = dto.Comment,
                AttachmentUrl = dto.AttachmentUrl,
                StatusChange = dto.StatusChange,
                CreatedAt = DateTime.UtcNow
            };

            if (!string.IsNullOrWhiteSpace(dto.StatusChange))
            {
                ticket.Status = dto.StatusChange;
                if (dto.StatusChange == "Resolved" || dto.StatusChange == "Closed")
                {
                    ticket.ResolvedAt = DateTime.UtcNow;
                }
            }

            _context.TicketComments.Add(comment);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TicketUpdated",
                TicketNumber = ticket.TicketNumber,
                Action = "CommentAdded",
                User = currentUserName
            });

            return Ok(new { success = true, message = "Komentar berhasil ditambahkan!", data = comment });
        }

        private static TicketResponseDto MapToDto(Ticket t)
        {
            return new TicketResponseDto
            {
                Id = t.Id,
                TicketNumber = t.TicketNumber,
                ProjectId = t.ProjectId,
                ProjectName = t.Project != null ? t.Project.Name : "",
                ProjectCode = t.Project != null ? t.Project.Code : "",
                Title = t.Title,
                Description = t.Description,
                Severity = t.Severity,
                Category = t.Category,
                Status = t.Status,
                ReportedByUserId = t.ReportedByUserId,
                ReportedByUserName = t.ReportedByUser != null ? t.ReportedByUser.FullName : "",
                ReportedByUserRole = t.ReportedByUser != null ? t.ReportedByUser.Role : "",
                AssignedCaretakerId = t.AssignedCaretakerId,
                AssignedCaretakerName = t.AssignedCaretaker != null ? t.AssignedCaretaker.FullName : null,
                AssignedCaretakerAvatar = t.AssignedCaretaker != null ? t.AssignedCaretaker.AvatarUrl : null,
                AttachmentUrl = t.AttachmentUrl,
                ResolutionNotes = t.ResolutionNotes,
                CreatedAt = t.CreatedAt,
                ResolvedAt = t.ResolvedAt,
                Comments = t.Comments?.Select(c => new TicketCommentDto
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    UserName = c.User != null ? c.User.FullName : "",
                    UserRole = c.User != null ? c.User.Role : "",
                    UserAvatar = c.User != null ? c.User.AvatarUrl : null,
                    Comment = c.Comment,
                    AttachmentUrl = c.AttachmentUrl,
                    StatusChange = c.StatusChange,
                    CreatedAt = c.CreatedAt
                }).OrderBy(c => c.CreatedAt).ToList() ?? new()
            };
        }
    }
}
