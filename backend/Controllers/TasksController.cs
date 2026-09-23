using System;
using System.Collections.Generic;
using System.IO;
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
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<SyncHub> _hubContext;
        private readonly IAuditService _auditService;
        private readonly ITaskExcelImportService _importService;

        public TasksController(AppDbContext context, IHubContext<SyncHub> hubContext, IAuditService auditService, ITaskExcelImportService importService)
        {
            _context = context;
            _hubContext = hubContext;
            _auditService = auditService;
            _importService = importService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? projectId, 
            [FromQuery] string? status, 
            [FromQuery] int? assigneeId,
            [FromQuery] bool? pendingDeletion)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
            bool isGlobalManager = currentUserRole == "Admin" || currentUserRole == "ProjectManager" || currentUserRole == "Project Manager";

            var query = _context.Tasks
                .Include(t => t.Project).ThenInclude(p => p.Members)
                .Include(t => t.Assignee)
                .AsQueryable();

            if (projectId.HasValue)
                query = query.Where(t => t.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (assigneeId.HasValue)
                query = query.Where(t => t.AssigneeId == assigneeId.Value);

            if (pendingDeletion.HasValue && pendingDeletion.Value)
                query = query.Where(t => t.IsPendingDeletion);

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponseDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "",
                    ProjectCode = t.Project != null ? t.Project.Code : "",
                    ProjectColor = t.Project != null ? t.Project.Color : "#4f46e5",
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    Category = t.Category,
                    Milestone = t.Milestone,
                    AssigneeId = t.AssigneeId,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                    AssigneeAvatar = t.Assignee != null ? t.Assignee.AvatarUrl : null,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CommentCount = t.Comments.Count,
                    CreatedAt = t.CreatedAt,
                    IsPendingDeletion = t.IsPendingDeletion,
                    DeletionRequestedById = t.DeletionRequestedById,
                    DeletionRequestedByName = t.DeletionRequestedByName,
                    DeletionReason = t.DeletionReason,
                    DeletionRequestedAt = t.DeletionRequestedAt,
                    CanApproveDeletion = isGlobalManager || (t.Project != null && (t.Project.CreatedByUserId == currentUserId || (t.Project.Members != null && t.Project.Members.Any(m => m.UserId == currentUserId && m.RoleInProject == "Manager"))))
                })
                .ToListAsync();

            return Ok(new { success = true, data = tasks });
        }

        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks([FromQuery] int? projectId, [FromQuery] string? status)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var currentUserId))
                return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });

            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
            bool isGlobalManager = currentUserRole == "Admin" || currentUserRole == "ProjectManager" || currentUserRole == "Project Manager";

            var query = _context.Tasks
                .Include(t => t.Project).ThenInclude(p => p.Members)
                .Include(t => t.Assignee)
                .Where(t => t.AssigneeId == currentUserId)
                .AsQueryable();

            if (projectId.HasValue && projectId.Value > 0)
                query = query.Where(t => t.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponseDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "",
                    ProjectCode = t.Project != null ? t.Project.Code : "",
                    ProjectColor = t.Project != null ? t.Project.Color : "#4f46e5",
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    Category = t.Category,
                    Milestone = t.Milestone,
                    AssigneeId = t.AssigneeId,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                    AssigneeAvatar = t.Assignee != null ? t.Assignee.AvatarUrl : null,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CommentCount = t.Comments.Count,
                    CreatedAt = t.CreatedAt,
                    IsPendingDeletion = t.IsPendingDeletion,
                    DeletionRequestedById = t.DeletionRequestedById,
                    DeletionRequestedByName = t.DeletionRequestedByName,
                    DeletionReason = t.DeletionReason,
                    DeletionRequestedAt = t.DeletionRequestedAt,
                    CanApproveDeletion = isGlobalManager || (t.Project != null && (t.Project.CreatedByUserId == currentUserId || (t.Project.Members != null && t.Project.Members.Any(m => m.UserId == currentUserId && m.RoleInProject == "Manager"))))
                })
                .ToListAsync();

            return Ok(new { success = true, data = tasks, isMyTasks = true, userId = currentUserId });
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
                Category = dto.Category,
                Milestone = dto.Milestone,
                AssigneeId = dto.AssigneeId,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                EstimatedHours = dto.EstimatedHours,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentUserId);

            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = task.Id,
                UserId = currentUserId > 0 ? currentUserId : null,
                ActionType = "Created",
                Description = $"Tugas '{task.Title}' dibuat.",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_CREATED", "Tasks", $"Tugas baru '{task.Title}' dibuat.", "Info", null, currentUserName, currentUserRole);

            // Broadcast real-time update to all clients
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = task.Id,
                Title = task.Title,
                Status = task.Status,
                Action = "Created"
            });

            var project = await _context.Projects.FindAsync(task.ProjectId);
            var assignee = task.AssigneeId.HasValue ? await _context.Users.FindAsync(task.AssigneeId.Value) : null;

            var responseDto = new TaskResponseDto
            {
                Id = task.Id,
                ProjectId = task.ProjectId,
                ProjectName = project?.Name ?? "",
                ProjectCode = project?.Code ?? "",
                ProjectColor = project?.Color ?? "#4f46e5",
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                Category = task.Category,
                Milestone = task.Milestone,
                AssigneeId = task.AssigneeId,
                AssigneeName = assignee?.FullName,
                AssigneeAvatar = assignee?.AvatarUrl,
                StartDate = task.StartDate,
                DueDate = task.DueDate,
                EstimatedHours = task.EstimatedHours,
                CommentCount = 0,
                CreatedAt = task.CreatedAt
            };

            return Ok(new { success = true, message = "Tugas berhasil dibuat!", data = responseDto });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var oldStatus = task.Status;
            task.Status = dto.Status;

            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);

            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = task.Id,
                UserId = currentUserId > 0 ? currentUserId : null,
                ActionType = "StatusChanged",
                Description = $"Status tugas diubah dari '{oldStatus}' menjadi '{task.Status}'.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await _auditService.LogAsync("TASK_STATUS_CHANGED", "Tasks", $"Tugas '{task.Title}' dipindahkan dari {oldStatus} ke {task.Status}.", "Info", null, currentUserName, currentUserRole);

            // Broadcast real-time update to all clients
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = task.Id,
                Title = task.Title,
                Status = task.Status,
                Action = "StatusChanged",
                UpdatedBy = currentUserName
            });

            return Ok(new { 
                success = true, 
                message = "Status tugas berhasil diperbarui!", 
                data = new {
                    task.Id,
                    task.ProjectId,
                    task.Title,
                    task.Status,
                    task.Priority
                }
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.Project).ThenInclude(p => p.Members)
                .Include(t => t.Assignee)
                .Include(t => t.Comments)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
            bool isGlobalManager = currentUserRole == "Admin" || currentUserRole == "ProjectManager" || currentUserRole == "Project Manager";

            var canApprove = isGlobalManager || (task.Project != null && (task.Project.CreatedByUserId == currentUserId || (task.Project.Members != null && task.Project.Members.Any(m => m.UserId == currentUserId && m.RoleInProject == "Manager"))));

            var responseDto = new TaskResponseDto
            {
                Id = task.Id,
                ProjectId = task.ProjectId,
                ProjectName = task.Project != null ? task.Project.Name : "",
                ProjectCode = task.Project != null ? task.Project.Code : "",
                ProjectColor = task.Project != null ? task.Project.Color : "#4f46e5",
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                Category = task.Category,
                Milestone = task.Milestone,
                AssigneeId = task.AssigneeId,
                AssigneeName = task.Assignee != null ? task.Assignee.FullName : null,
                AssigneeAvatar = task.Assignee != null ? task.Assignee.AvatarUrl : null,
                StartDate = task.StartDate,
                DueDate = task.DueDate,
                EstimatedHours = task.EstimatedHours,
                CommentCount = task.Comments != null ? task.Comments.Count : 0,
                CreatedAt = task.CreatedAt,
                IsPendingDeletion = task.IsPendingDeletion,
                DeletionRequestedById = task.DeletionRequestedById,
                DeletionRequestedByName = task.DeletionRequestedByName,
                DeletionReason = task.DeletionReason,
                DeletionRequestedAt = task.DeletionRequestedAt,
                CanApproveDeletion = canApprove
            };

            return Ok(new { success = true, data = responseDto });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var oldTitle = task.Title;
            var oldStatus = task.Status;
            var oldPriority = task.Priority;
            var oldAssigneeId = task.AssigneeId;

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.ProjectId = dto.ProjectId;
            task.Status = dto.Status;
            task.Priority = dto.Priority;
            task.Category = dto.Category;
            task.Milestone = dto.Milestone;
            task.AssigneeId = dto.AssigneeId;
            task.StartDate = dto.StartDate;
            task.DueDate = dto.DueDate;
            task.EstimatedHours = dto.EstimatedHours;

            var project = await _context.Projects.FindAsync(task.ProjectId);
            var assignee = task.AssigneeId.HasValue ? await _context.Users.FindAsync(task.AssigneeId.Value) : null;

            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name);

            var changes = new List<string>();
            if (oldStatus != task.Status) changes.Add($"status ke '{task.Status}'");
            if (oldPriority != task.Priority) changes.Add($"prioritas ke '{task.Priority}'");
            if (oldAssigneeId != task.AssigneeId) changes.Add(assignee != null ? $"PIC ke '{assignee.FullName}'" : "PIC dicopot");
            if (oldTitle != task.Title) changes.Add($"judul tugas diperbarui");

            var changeSummary = changes.Count > 0 ? string.Join(", ", changes) : "detail tugas diperbarui";
            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = task.Id,
                UserId = currentUserId > 0 ? currentUserId : null,
                ActionType = "Updated",
                Description = $"Pembaruan tugas: {changeSummary}.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var commentCount = await _context.TaskComments.CountAsync(c => c.TaskId == task.Id);

            var responseDto = new TaskResponseDto
            {
                Id = task.Id,
                ProjectId = task.ProjectId,
                ProjectName = project?.Name ?? "",
                ProjectCode = project?.Code ?? "",
                ProjectColor = project?.Color ?? "#4f46e5",
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                Category = task.Category,
                Milestone = task.Milestone,
                AssigneeId = task.AssigneeId,
                AssigneeName = assignee?.FullName,
                AssigneeAvatar = assignee?.AvatarUrl,
                StartDate = task.StartDate,
                DueDate = task.DueDate,
                EstimatedHours = task.EstimatedHours,
                CommentCount = commentCount,
                CreatedAt = task.CreatedAt
            };

            await _auditService.LogAsync("TASK_UPDATED", "Tasks", $"Tugas '{task.Title}' diperbarui.", "Info", null, currentUserName);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { 
                Type = "TaskUpdated", 
                TaskId = task.Id, 
                Title = task.Title, 
                Status = task.Status,
                Action = "Updated" 
            });

            return Ok(new { success = true, message = "Tugas berhasil diperbarui!", data = responseDto });
        }

        [HttpGet("{id}/comments")]
        public async Task<IActionResult> GetComments(int id)
        {
            var taskExists = await _context.Tasks.AnyAsync(t => t.Id == id);
            if (!taskExists)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "";

            var comments = await _context.TaskComments
                .Include(c => c.User)
                .Where(c => c.TaskId == id)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new TaskCommentDto
                {
                    Id = c.Id,
                    TaskId = c.TaskId,
                    UserId = c.UserId,
                    UserName = c.User != null ? c.User.FullName : "Pengguna",
                    UserRole = c.User != null ? c.User.Role : "Member",
                    UserAvatar = c.User != null ? c.User.AvatarUrl : null,
                    Comment = c.Comment,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    IsOwner = c.UserId == currentUserId || currentUserRole == "Admin" || currentUserRole == "Project Manager"
                })
                .ToListAsync();

            return Ok(new { success = true, data = comments });
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromBody] CreateTaskCommentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Comment))
                return BadRequest(new { success = false, message = "Isi komentar tidak boleh kosong." });

            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var currentUserId))
                return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });

            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Pengguna";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Member";

            var comment = new TaskComment
            {
                TaskId = id,
                UserId = currentUserId,
                Comment = dto.Comment.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.TaskComments.Add(comment);

            // Add Task Activity
            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = id,
                UserId = currentUserId,
                ActionType = "CommentAdded",
                Description = $"{currentUserName} menambahkan komentar pada tugas.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_COMMENT_ADDED", "Tasks", 
                $"{currentUserName} berkomentar pada tugas '{task.Title}'.", "Info", null, currentUserName, currentUserRole);

            var user = await _context.Users.FindAsync(currentUserId);
            var responseComment = new TaskCommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                UserId = comment.UserId,
                UserName = user?.FullName ?? currentUserName,
                UserRole = user?.Role ?? currentUserRole,
                UserAvatar = user?.AvatarUrl,
                Comment = comment.Comment,
                CreatedAt = comment.CreatedAt,
                IsOwner = true
            };

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskCommentAdded",
                TaskId = id,
                CommentId = comment.Id,
                User = currentUserName
            });

            return Ok(new { success = true, message = "Komentar berhasil ditambahkan!", data = responseComment });
        }

        [HttpDelete("{id}/comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int id, int commentId)
        {
            var comment = await _context.TaskComments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == id);
            if (comment == null)
                return NotFound(new { success = false, message = "Komentar tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "";

            // Only comment owner or Admin/Manager can delete
            if (comment.UserId != currentUserId && currentUserRole != "Admin" && currentUserRole != "Project Manager")
                return Forbid();

            _context.TaskComments.Remove(comment);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskCommentDeleted",
                TaskId = id,
                CommentId = commentId
            });

            return Ok(new { success = true, message = "Komentar berhasil dihapus." });
        }

        [HttpGet("{id}/activities")]
        public async Task<IActionResult> GetActivities(int id)
        {
            var taskExists = await _context.Tasks.AnyAsync(t => t.Id == id);
            if (!taskExists)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var activities = await _context.TaskActivities
                .Include(a => a.User)
                .Where(a => a.TaskId == id)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new TaskActivityDto
                {
                    Id = a.Id,
                    TaskId = a.TaskId,
                    UserId = a.UserId,
                    UserName = a.User != null ? a.User.FullName : "Sistem",
                    UserAvatar = a.User != null ? a.User.AvatarUrl : null,
                    ActionType = a.ActionType,
                    Description = a.Description,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = activities });
        }

        private async Task<bool> CanDirectlyDeleteOrApproveTaskAsync(TaskItem task, int currentUserId, string currentUserRole)
        {
            if (currentUserRole == "Admin") return true;
            if (currentUserRole == "ProjectManager" || currentUserRole == "Project Manager") return true;

            var project = await _context.Projects
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == task.ProjectId);

            if (project != null)
            {
                if (project.CreatedByUserId == currentUserId) return true;

                var member = project.Members.FirstOrDefault(m => m.UserId == currentUserId);
                if (member != null && member.RoleInProject.Equals("Manager", StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        [HttpPost("{id}/request-deletion")]
        public async Task<IActionResult> RequestDeletion(int id, [FromBody] RequestTaskDeletionDto? dto)
        {
            var task = await _context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Anggota Tim";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Member";

            var reason = !string.IsNullOrWhiteSpace(dto?.Reason) ? dto.Reason.Trim() : "Permohonan penghapusan diajukan oleh anggota tim.";

            task.IsPendingDeletion = true;
            task.DeletionRequestedById = currentUserId;
            task.DeletionRequestedByName = currentUserName;
            task.DeletionReason = reason;
            task.DeletionRequestedAt = DateTime.UtcNow;

            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = id,
                UserId = currentUserId,
                ActionType = "DeletionRequested",
                Description = $"{currentUserName} mengajukan permohonan penghapusan tugas. Alasan: \"{reason}\".",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_DELETION_REQUESTED", "Tasks",
                $"Permohonan hapus tugas '{task.Title}' diajukan oleh {currentUserName}. Alasan: {reason}.",
                "Warning", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = id,
                Action = "DeletionRequested",
                RequestedBy = currentUserName,
                Reason = reason
            });

            return Ok(new
            {
                success = true,
                message = "Permohonan penghapusan tugas telah diajukan dan sedang menunggu persetujuan Administrator atau Project Manager.",
                data = new
                {
                    task.Id,
                    task.Title,
                    task.IsPendingDeletion,
                    task.DeletionRequestedById,
                    task.DeletionRequestedByName,
                    task.DeletionReason,
                    task.DeletionRequestedAt
                }
            });
        }

        [HttpPost("{id}/approve-deletion")]
        public async Task<IActionResult> ApproveDeletion(int id)
        {
            var task = await _context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Administrator";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

            var canApprove = await CanDirectlyDeleteOrApproveTaskAsync(task, currentUserId, currentUserRole);
            if (!canApprove)
                return StatusCode(403, new { success = false, message = "Hanya Administrator, Project Manager, atau Project Owner yang berhak menyetujui penghapusan tugas." });

            var title = task.Title;
            var requester = task.DeletionRequestedByName ?? "Member";

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_DELETION_APPROVED", "Tasks",
                $"Persetujuan hapus tugas '{title}' (diajukan oleh {requester}) disetujui oleh {currentUserName}.",
                "Warning", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = id,
                Action = "Deleted"
            });

            return Ok(new { success = true, message = $"Penghapusan tugas '{title}' berhasil disetujui dan dihapus secara permanen." });
        }

        [HttpPost("{id}/reject-deletion")]
        public async Task<IActionResult> RejectDeletion(int id, [FromBody] RejectTaskDeletionDto? dto)
        {
            var task = await _context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Administrator";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

            var canApprove = await CanDirectlyDeleteOrApproveTaskAsync(task, currentUserId, currentUserRole);
            if (!canApprove)
                return StatusCode(403, new { success = false, message = "Hanya Administrator, Project Manager, atau Project Owner yang berhak menolak penghapusan tugas." });

            var rejectReason = !string.IsNullOrWhiteSpace(dto?.Reason) ? dto.Reason.Trim() : "Permohonan tidak disetujui oleh manajer proyek.";

            task.IsPendingDeletion = false;
            task.DeletionRequestedById = null;
            task.DeletionRequestedByName = null;
            task.DeletionReason = null;
            task.DeletionRequestedAt = null;

            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = id,
                UserId = currentUserId,
                ActionType = "DeletionRejected",
                Description = $"{currentUserName} menolak pengajuan penghapusan tugas. Alasan penolakan: \"{rejectReason}\".",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_DELETION_REJECTED", "Tasks",
                $"Pengajuan hapus tugas '{task.Title}' ditolak oleh {currentUserName}. Alasan: {rejectReason}.",
                "Info", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = id,
                Action = "DeletionRejected"
            });

            return Ok(new { success = true, message = "Pengajuan penghapusan tugas berhasil ditolak. Tugas tetap aktif.", reason = rejectReason });
        }

        [HttpPost("{id}/cancel-deletion-request")]
        public async Task<IActionResult> CancelDeletionRequest(int id)
        {
            var task = await _context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Anggota Tim";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Member";

            var canApprove = await CanDirectlyDeleteOrApproveTaskAsync(task, currentUserId, currentUserRole);
            var isRequester = task.DeletionRequestedById == currentUserId;

            if (!canApprove && !isRequester)
                return StatusCode(403, new { success = false, message = "Anda tidak memiliki wewenang untuk membatalkan pengajuan ini." });

            task.IsPendingDeletion = false;
            task.DeletionRequestedById = null;
            task.DeletionRequestedByName = null;
            task.DeletionReason = null;
            task.DeletionRequestedAt = null;

            _context.TaskActivities.Add(new TaskActivity
            {
                TaskId = id,
                UserId = currentUserId,
                ActionType = "DeletionCancelled",
                Description = $"{currentUserName} membatalkan permohonan penghapusan tugas.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                TaskId = id,
                Action = "DeletionCancelled"
            });

            return Ok(new { success = true, message = "Permohonan penghapusan tugas telah dibatalkan." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] string? reason)
        {
            var task = await _context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id);
            if (task == null)
                return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int.TryParse(userIdStr, out var currentUserId);
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Pengguna";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Member";

            var canDirectlyDelete = await CanDirectlyDeleteOrApproveTaskAsync(task, currentUserId, currentUserRole);
            if (!canDirectlyDelete)
            {
                // Member is requesting deletion!
                return await RequestDeletion(id, new RequestTaskDeletionDto { Reason = reason });
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync("TASK_DELETED", "Tasks", $"Tugas '{task.Title}' dihapus secara langsung oleh {currentUserName}.", "Warning", null, currentUserName, currentUserRole);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "TaskUpdated", TaskId = id, Action = "Deleted" });

            return Ok(new { success = true, message = "Tugas berhasil dihapus." });
        }

        [HttpGet("export")]
        public async Task<IActionResult> ExportTasks(
            [FromQuery] int? projectId,
            [FromQuery] string? category,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] bool onlyMyTasks = false,
            [FromQuery] string format = "xlsx")
        {
            var query = _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.Assignee)
                .AsQueryable();

            if (onlyMyTasks)
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdStr, out var currentUserId))
                {
                    query = query.Where(t => t.AssigneeId == currentUserId);
                }
            }

            if (projectId.HasValue && projectId.Value > 0)
                query = query.Where(t => t.ProjectId == projectId.Value);

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(t => t.Category == category);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t => 
                    t.Title.ToLower().Contains(s) ||
                    t.Description.ToLower().Contains(s) ||
                    (t.Category != null && t.Category.ToLower().Contains(s)) ||
                    (t.Milestone != null && t.Milestone.ToLower().Contains(s)) ||
                    (t.Project != null && (t.Project.Name.ToLower().Contains(s) || t.Project.Code.ToLower().Contains(s))) ||
                    (t.Assignee != null && t.Assignee.FullName.ToLower().Contains(s)));
            }

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskResponseDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "",
                    ProjectCode = t.Project != null ? t.Project.Code : "",
                    ProjectColor = t.Project != null ? t.Project.Color : "#4f46e5",
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    Category = t.Category,
                    Milestone = t.Milestone,
                    AssigneeId = t.AssigneeId,
                    AssigneeName = t.Assignee != null ? t.Assignee.FullName : null,
                    AssigneeAvatar = t.Assignee != null ? t.Assignee.AvatarUrl : null,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            var filters = new List<string>();
            if (projectId.HasValue && projectId.Value > 0)
            {
                var p = await _context.Projects.FindAsync(projectId.Value);
                if (p != null) filters.Add($"Proyek: {p.Name}");
            }
            if (!string.IsNullOrWhiteSpace(category)) filters.Add($"Kategori: {category}");
            if (!string.IsNullOrWhiteSpace(status)) filters.Add($"Status: {status}");
            if (!string.IsNullOrWhiteSpace(search)) filters.Add($"Pencarian: \"{search.Trim()}\"");

            var filterSummary = filters.Count > 0 ? string.Join(", ", filters) : "Semua Data (Tanpa Filter)";

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            await _auditService.LogAsync("TASKS_EXPORTED", "Tasks", 
                $"Data tugas diekspor ({tasks.Count} tugas, Format: {format.ToUpper()}, Filter: {filterSummary}).", 
                "Info", null, currentUserName);

            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");

            if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            {
                var csvBytes = _importService.GenerateTasksExportCsv(tasks);
                return File(csvBytes, "text/csv; charset=utf-8", $"Laporan_Tugas_{timestamp}.csv");
            }
            else
            {
                var excelBytes = _importService.GenerateTasksExportExcel(tasks, filterSummary);
                return File(excelBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Laporan_Tugas_{timestamp}.xlsx");
            }
        }

        [HttpGet("template-excel")]
        [AllowAnonymous]
        public IActionResult DownloadTemplateExcel()
        {
            var bytes = _importService.GenerateTemplateExcel();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Template_Import_Tugas.xlsx");
        }

        [HttpPost("import-excel")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ImportExcel([FromForm] TaskExcelImportDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int currentUserId = int.TryParse(userIdStr, out var pId) ? pId : 1;
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "System Administrator";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

            if (dto.File == null || dto.File.Length == 0)
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    "Percobaan impor berkas Excel gagal: Tidak ada berkas yang diunggah atau ukuran berkas 0 byte.",
                    "Warning",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Berkas Kosong",
                    message = "Silakan unggah berkas Excel (.xlsx atau .xls) yang berisi data tugas." 
                });
            }

            var ext = Path.GetExtension(dto.File.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    $"Percobaan impor berkas '{dto.File.FileName}' gagal: Format ekstensi '{ext}' tidak didukung. Sistem hanya menerima .xlsx atau .xls.",
                    "Warning",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Format Berkas Tidak Didukung",
                    fileName = dto.File.FileName,
                    message = $"Format berkas '{ext}' tidak didukung. Pastikan berkas yang diimpor menggunakan ekstensi resmi Microsoft Excel (.xlsx atau .xls)." 
                });
            }

            var users = await _context.Users.ToListAsync();
            var allProjects = await _context.Projects.ToListAsync();

            // Check optional fallback project name if ProjectId was provided
            string? fallbackProjectName = null;
            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                var fb = allProjects.FirstOrDefault(p => p.Id == dto.ProjectId.Value);
                fallbackProjectName = fb?.Name;
            }

            ExcelImportPackage package;
            try
            {
                using (var stream = dto.File.OpenReadStream())
                {
                    package = _importService.ParseTasksPackageFromExcel(stream, users, fallbackProjectName);
                }
            }
            catch (FormatException fEx)
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    $"Impor berkas '{dto.File.FileName}' gagal karena ketidaksesuaian struktur: {fEx.Message}",
                    "Warning",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Struktur Kolom Tidak Sesuai",
                    fileName = dto.File.FileName,
                    message = fEx.Message 
                });
            }
            catch (InvalidDataException iEx)
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    $"Impor berkas '{dto.File.FileName}' gagal karena berkas Excel rusak/corrupt: {iEx.Message}",
                    "Error",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Berkas Rusak atau Terkorupsi",
                    fileName = dto.File.FileName,
                    message = iEx.Message 
                });
            }
            catch (Exception ex)
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    $"Kesalahan sistem saat memproses impor berkas '{dto.File.FileName}': {ex.Message}",
                    "Error",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Gagal Membaca Berkas Excel",
                    fileName = dto.File.FileName,
                    message = $"Gagal membaca berkas Excel: {ex.Message}. Pastikan berkas merupakan format Excel (.xlsx/.xls) yang valid dan tidak terkunci kata sandi." 
                });
            }

            var parsedItems = package.Tasks;
            if (parsedItems.Count == 0 && package.NewUsersToCreate.Count == 0)
            {
                await _auditService.LogAsync(
                    "TASKS_IMPORT_FAILED",
                    "Tasks",
                    $"Impor berkas '{dto.File.FileName}' selesai tanpa data: Tidak ada baris tugas atau pengguna yang valid ditemukan.",
                    "Warning",
                    currentUserId, currentUserName, currentUserRole
                );
                return BadRequest(new { 
                    success = false, 
                    title = "Data Tugas Tidak Ditemukan",
                    fileName = dto.File.FileName,
                    message = "Tidak ada baris data tugas atau pengguna yang valid ditemukan pada berkas Excel tersebut. Pastikan berkas memiliki baris data di bawah 25 kolom header resmi." 
                });
            }

            // 1. Save auto-created users if any were found in User sheets, Person sheets, or Developer columns
            var createdUsersList = new List<User>();
            if (package.NewUsersToCreate.Count > 0)
            {
                foreach (var newUser in package.NewUsersToCreate)
                {
                    // Verify if user already exists in DB
                    var exists = allProjects != null && _context.Users.Any(u => 
                        u.Email.ToLower() == newUser.Email.ToLower() ||
                        u.FullName.ToLower() == newUser.FullName.ToLower());

                    if (!exists)
                    {
                        _context.Users.Add(newUser);
                        createdUsersList.Add(newUser);
                    }
                }

                if (createdUsersList.Count > 0)
                {
                    await _context.SaveChangesAsync();
                    // Refresh users list with newly assigned IDs
                    users = await _context.Users.ToListAsync();
                }

                // Re-link assignee for tasks that referenced newly created users
                foreach (var item in parsedItems)
                {
                    if (!item.Task.AssigneeId.HasValue && !string.IsNullOrWhiteSpace(item.DeveloperOrPicName))
                    {
                        var target = item.DeveloperOrPicName.Trim();
                        var matched = users.FirstOrDefault(u => 
                            u.FullName.Equals(target, StringComparison.OrdinalIgnoreCase) ||
                            u.Email.Equals(target, StringComparison.OrdinalIgnoreCase) ||
                            u.FullName.IndexOf(target, StringComparison.OrdinalIgnoreCase) >= 0 ||
                            target.IndexOf(u.FullName, StringComparison.OrdinalIgnoreCase) >= 0);
                        if (matched != null)
                        {
                            item.Task.AssigneeId = matched.Id;
                        }
                    }
                }
            }

            // 2. Resolve project for each task based on Excel project_name column
            // Aturan: Jika penamaan project, task, dll tidak tersedia di database atau file, skip saja (jangan buat proyek otomatis)
            // Validasi duplikasi & data tidak lengkap:
            var existingTasks = await _context.Tasks
                .Select(t => new { t.ProjectId, t.Title })
                .ToListAsync();

            var existingTaskKeySet = new HashSet<string>(
                existingTasks.Select(t => $"{t.ProjectId}:::{t.Title.Trim().ToLowerInvariant()}"),
                StringComparer.OrdinalIgnoreCase
            );

            var currentBatchKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var duplicateReasons = new List<string>();
            int duplicateCount = 0;
            var incompleteReasons = new List<string>(package.IncompleteReasons);
            int incompleteCount = package.IncompleteTasksCount;

            var validTasksToInsert = new List<TaskItem>();
            var matchedProjectsMap = new Dictionary<string, Project>(StringComparer.OrdinalIgnoreCase);
            var skippedUnavailableProjects = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in parsedItems)
            {
                var targetName = item.ProjectName?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(targetName))
                {
                    targetName = fallbackProjectName ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(targetName) || targetName == "-" || targetName.Equals("n/a", StringComparison.OrdinalIgnoreCase) || targetName.Equals("none", StringComparison.OrdinalIgnoreCase))
                {
                    package.SkippedTasksCount++;
                    incompleteCount++;
                    var incReason = $"Tugas '{item.Task.Title}' dilewati karena informasi nama proyek tidak lengkap atau tidak tersedia.";
                    incompleteReasons.Add(incReason);
                    package.SkippedReasons.Add(incReason);
                    continue;
                }

                // Match existing project by exact Name or Code, or contains
                if (!matchedProjectsMap.TryGetValue(targetName, out var matchedProject))
                {
                    matchedProject = allProjects.FirstOrDefault(p => 
                        p.Name.Equals(targetName, StringComparison.OrdinalIgnoreCase) ||
                        p.Code.Equals(targetName, StringComparison.OrdinalIgnoreCase))
                        ?? allProjects.FirstOrDefault(p => 
                            p.Name.IndexOf(targetName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                            targetName.IndexOf(p.Name, StringComparison.OrdinalIgnoreCase) >= 0);

                    if (matchedProject != null)
                    {
                        matchedProjectsMap[targetName] = matchedProject;
                    }
                }

                if (matchedProject == null)
                {
                    // Project tidak tersedia di database -> skip saja, tidak perlu dimasukkan dan tidak perlu dibuat proyek baru
                    package.SkippedTasksCount++;
                    skippedUnavailableProjects.Add(targetName);
                    continue;
                }

                // Validasi Duplikasi: Cek apakah tugas dengan judul yang sama pada proyek yang sama sudah ada di DB atau di batch saat ini
                var taskKey = $"{matchedProject.Id}:::{item.Task.Title.Trim().ToLowerInvariant()}";
                if (existingTaskKeySet.Contains(taskKey) || currentBatchKeys.Contains(taskKey))
                {
                    duplicateCount++;
                    package.SkippedTasksCount++;
                    var dupReason = $"Tugas '{item.Task.Title}' pada proyek '{matchedProject.Name}' dilewati karena terdeteksi duplikasi.";
                    duplicateReasons.Add(dupReason);
                    package.SkippedReasons.Add(dupReason);
                    continue;
                }

                currentBatchKeys.Add(taskKey);
                item.Task.ProjectId = matchedProject.Id;
                item.Task.Project = null; // Detach reference for clean insert
                validTasksToInsert.Add(item.Task);
            }

            if (skippedUnavailableProjects.Count > 0)
            {
                var skippedListStr = string.Join(", ", skippedUnavailableProjects);
                package.SkippedReasons.Add($"Tugas dengan proyek yang belum terdaftar di database dilewati ({skippedListStr}).");
            }

            if (validTasksToInsert.Count == 0 && createdUsersList.Count == 0)
            {
                var detailNotes = new List<string>();
                if (duplicateCount > 0) detailNotes.Add($"{duplicateCount} duplikasi");
                if (incompleteCount > 0) detailNotes.Add($"{incompleteCount} data tidak lengkap");
                if (skippedUnavailableProjects.Count > 0) detailNotes.Add($"{skippedUnavailableProjects.Count} proyek belum terdaftar");

                var reasonDetail = detailNotes.Count > 0 ? string.Join(", ", detailNotes) : "proyek atau tugas tidak tersedia di sistem";
                var processedSheetsStr = package.ProcessedSheets.Count > 0 ? string.Join(", ", package.ProcessedSheets) : "Sheet Utama";

                await _auditService.LogAsync(
                    "TASKS_IMPORTED_EXCEL", 
                    "Tasks", 
                    $"Impor berkas Excel '{dto.File.FileName}' selesai tanpa tugas baru yang ditambahkan: {package.SkippedTasksCount} tugas dilewati ({reasonDetail}). Sheet diproses: [{processedSheetsStr}].", 
                    duplicateCount > 0 ? "Warning" : "Info", 
                    currentUserId, currentUserName, currentUserRole
                );

                return Ok(new
                {
                    success = true,
                    count = 0,
                    projectsCount = 0,
                    projectNames = new List<string>(),
                    skippedTasksCount = package.SkippedTasksCount,
                    skippedReasons = package.SkippedReasons,
                    duplicateCount = duplicateCount,
                    duplicateReasons = duplicateReasons,
                    incompleteCount = incompleteCount,
                    incompleteReasons = incompleteReasons,
                    newUsersCount = 0,
                    newUsers = new List<object>(),
                    skippedSheets = package.SkippedSheets,
                    processedSheets = package.ProcessedSheets,
                    fileName = dto.File.FileName,
                    message = $"Tidak ada tugas baru yang diimpor. Sebanyak {package.SkippedTasksCount} tugas dilewati ({reasonDetail}).",
                    data = new
                    {
                        importedCount = 0,
                        duplicateCount = duplicateCount,
                        incompleteCount = incompleteCount,
                        skippedTasksCount = package.SkippedTasksCount,
                        skippedReasons = package.SkippedReasons,
                        duplicateReasons = duplicateReasons,
                        incompleteReasons = incompleteReasons,
                        projectsCount = 0,
                        projectNames = new List<string>(),
                        newUsersCount = 0,
                        skippedSheets = package.SkippedSheets,
                        processedSheets = package.ProcessedSheets,
                        fileName = dto.File.FileName
                    }
                });
            }

            if (validTasksToInsert.Count > 0)
            {
                _context.Tasks.AddRange(validTasksToInsert);
                await _context.SaveChangesAsync();
            }

            var distinctProjects = validTasksToInsert
                .Select(t => allProjects.FirstOrDefault(p => p.Id == t.ProjectId)?.Name ?? "")
                .Where(n => !string.IsNullOrEmpty(n))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var projectSummary = distinctProjects.Count <= 3 
                ? string.Join(", ", distinctProjects) 
                : $"{string.Join(", ", distinctProjects.Take(3))} dan {distinctProjects.Count - 3} proyek lainnya";

            // Build detailed descriptive message
            var msgParts = new List<string>();
            if (validTasksToInsert.Count > 0)
            {
                msgParts.Add($"Berhasil mengimpor {validTasksToInsert.Count} tugas ke dalam {distinctProjects.Count} proyek ({projectSummary})");
            }
            if (duplicateCount > 0)
            {
                msgParts.Add($"melewati {duplicateCount} tugas duplikat");
            }
            if (incompleteCount > 0)
            {
                msgParts.Add($"melewati {incompleteCount} tugas dengan data tidak lengkap");
            }
            if (skippedUnavailableProjects.Count > 0)
            {
                msgParts.Add($"melewati tugas dari {skippedUnavailableProjects.Count} proyek yang belum terdaftar");
            }
            if (createdUsersList.Count > 0)
            {
                var names = string.Join(", ", createdUsersList.Select(u => u.FullName).Take(3));
                if (createdUsersList.Count > 3) names += $" dan {createdUsersList.Count - 3} lainnya";
                msgParts.Add($"membuat {createdUsersList.Count} pengguna baru ({names})");
            }
            if (package.SkippedSheets.Count > 0)
            {
                msgParts.Add($"melewati {package.SkippedSheets.Count} sheet informasi/dashboard ({string.Join(", ", package.SkippedSheets.Take(2))})");
            }

            var finalMessage = string.Join(", ", msgParts) + "!";
            var fullProcessedSheets = package.ProcessedSheets.Count > 0 ? string.Join(", ", package.ProcessedSheets) : "Sheet Utama";

            await _auditService.LogAsync("TASKS_IMPORTED_EXCEL", "Tasks", 
                $"{validTasksToInsert.Count} tugas diimpor dari Excel '{dto.File.FileName}'. {duplicateCount} duplikat dilewati. {incompleteCount} data tidak lengkap dilewati. {package.SkippedTasksCount} total tugas dilewati. {createdUsersList.Count} user baru dibuat. Sheet: [{fullProcessedSheets}].", 
                "Info", currentUserId, currentUserName, currentUserRole);

            // Broadcast real-time update to all clients
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                Action = "Imported",
                Count = validTasksToInsert.Count,
                ProjectsCount = distinctProjects.Count,
                NewUsersCount = createdUsersList.Count
            });

            return Ok(new
            {
                success = true,
                count = validTasksToInsert.Count,
                projectsCount = distinctProjects.Count,
                projectNames = distinctProjects,
                skippedTasksCount = package.SkippedTasksCount,
                skippedReasons = package.SkippedReasons,
                duplicateCount = duplicateCount,
                duplicateReasons = duplicateReasons,
                incompleteCount = incompleteCount,
                incompleteReasons = incompleteReasons,
                newUsersCount = createdUsersList.Count,
                newUsers = createdUsersList.Select(u => new { u.Id, u.FullName, u.Email, u.Role }).ToList(),
                skippedSheets = package.SkippedSheets,
                processedSheets = package.ProcessedSheets,
                message = finalMessage,
                data = new
                {
                    importedCount = validTasksToInsert.Count,
                    duplicateCount = duplicateCount,
                    incompleteCount = incompleteCount,
                    skippedTasksCount = package.SkippedTasksCount,
                    skippedReasons = package.SkippedReasons,
                    duplicateReasons = duplicateReasons,
                    incompleteReasons = incompleteReasons,
                    projectsCount = distinctProjects.Count,
                    projectNames = distinctProjects,
                    newUsersCount = createdUsersList.Count,
                    skippedSheets = package.SkippedSheets
                }
            });
        }
    }
}
