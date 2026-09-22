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
                Category = dto.Category,
                Milestone = dto.Milestone,
                AssigneeId = dto.AssigneeId,
                DueDate = dto.DueDate,
                EstimatedHours = dto.EstimatedHours,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
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
                DueDate = task.DueDate,
                EstimatedHours = task.EstimatedHours,
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
            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
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

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            await _auditService.LogAsync("TASK_UPDATED", "Tasks", $"Tugas '{task.Title}' diperbarui.", "Info", null, currentUserName);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "TaskUpdated", TaskId = task.Id, Title = task.Title, Action = "Updated" });

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

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            await _auditService.LogAsync("TASK_DELETED", "Tasks", $"Tugas '{task.Title}' dihapus.", "Warning", null, currentUserName);
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new { Type = "TaskUpdated", TaskId = id, Action = "Deleted" });

            return Ok(new { success = true, message = "Tugas berhasil dihapus." });
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
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest(new { success = false, message = "Silakan unggah berkas Excel (.xlsx)." });

            var ext = Path.GetExtension(dto.File.FileName).ToLower();
            if (ext != ".xlsx" && ext != ".xls")
                return BadRequest(new { success = false, message = "Hanya berkas format Excel (.xlsx, .xls) yang didukung." });

            var users = await _context.Users.ToListAsync();
            var allProjects = await _context.Projects.ToListAsync();

            // Check optional fallback project name if ProjectId was provided
            string? fallbackProjectName = null;
            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                var fb = allProjects.FirstOrDefault(p => p.Id == dto.ProjectId.Value);
                fallbackProjectName = fb?.Name;
            }

            List<ParsedTaskItem> parsedItems;
            using (var stream = dto.File.OpenReadStream())
            {
                parsedItems = _importService.ParseTasksWithProjectFromExcel(stream, users, fallbackProjectName);
            }

            if (parsedItems.Count == 0)
                return BadRequest(new { success = false, message = "Tidak ada baris tugas yang berhasil dibaca dari berkas Excel tersebut. Pastikan berkas memiliki kolom 'Nama Task'." });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int currentUserId = int.TryParse(userIdStr, out var pId) ? pId : 1;
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "System Administrator";
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

            var newProjectsAdded = new List<Project>();
            var presetColors = new[] { "#4f46e5", "#10b981", "#0284c7", "#f59e0b", "#e11d48", "#8b5cf6", "#06b6d4" };

            // Resolve or create project for each task based on Excel Column 2
            foreach (var item in parsedItems)
            {
                var targetName = item.ProjectName.Trim();
                if (string.IsNullOrWhiteSpace(targetName))
                {
                    targetName = fallbackProjectName ?? (allProjects.FirstOrDefault()?.Name ?? "Proyek Utama");
                }

                // Match existing project by exact Name or Code, or contains
                var matchedProject = allProjects.FirstOrDefault(p => 
                    p.Name.Equals(targetName, StringComparison.OrdinalIgnoreCase) ||
                    p.Code.Equals(targetName, StringComparison.OrdinalIgnoreCase))
                    ?? allProjects.FirstOrDefault(p => 
                        p.Name.IndexOf(targetName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                        targetName.IndexOf(p.Name, StringComparison.OrdinalIgnoreCase) >= 0);

                if (matchedProject == null)
                {
                    // Generate unique project code
                    var words = targetName.Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
                    var initials = words.Length > 1 
                        ? string.Concat(words.Take(3).Select(w => char.ToUpper(w[0]))) 
                        : (targetName.Length >= 3 ? targetName.Substring(0, 3).ToUpper() : "PRJ");
                    
                    var candidateCode = initials;
                    int suffix = 1;
                    while (allProjects.Any(p => p.Code.Equals(candidateCode, StringComparison.OrdinalIgnoreCase)))
                    {
                        candidateCode = $"{initials}{suffix++}";
                    }

                    var color = presetColors[allProjects.Count % presetColors.Length];

                    matchedProject = new Project
                    {
                        Name = targetName.Length > 150 ? targetName.Substring(0, 150) : targetName,
                        Code = candidateCode,
                        Description = $"Proyek dibuat otomatis dari import tugas Excel pada {DateTime.UtcNow:dd MMM yyyy}.",
                        ClientName = "Internal",
                        Status = "Active",
                        ProjectType = "New Application",
                        Color = color,
                        StartDate = DateTime.UtcNow,
                        CreatedByUserId = currentUserId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Projects.Add(matchedProject);
                    allProjects.Add(matchedProject);
                    newProjectsAdded.Add(matchedProject);
                }

                // Assign matched project to task
                item.Task.Project = matchedProject;
            }

            // Save new projects first to generate IDs if any
            if (newProjectsAdded.Count > 0)
            {
                await _context.SaveChangesAsync();
            }

            // Assign ProjectId to all tasks
            foreach (var item in parsedItems)
            {
                item.Task.ProjectId = item.Task.Project?.Id ?? (allProjects.First().Id);
                item.Task.Project = null; // Detach reference for clean insert
            }

            _context.Tasks.AddRange(parsedItems.Select(p => p.Task));
            await _context.SaveChangesAsync();

            var distinctProjects = parsedItems
                .Select(p => p.ProjectName)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var projectSummary = distinctProjects.Count <= 3 
                ? string.Join(", ", distinctProjects) 
                : $"{string.Join(", ", distinctProjects.Take(3))} dan {distinctProjects.Count - 3} proyek lainnya";

            await _auditService.LogAsync("TASKS_IMPORTED_EXCEL", "Tasks", 
                $"{parsedItems.Count} tugas berhasil diimpor dari Excel '{dto.File.FileName}' ke dalam {distinctProjects.Count} proyek ({projectSummary}).", 
                "Info", null, currentUserName, currentUserRole);

            // Broadcast real-time update to all clients
            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "TaskUpdated",
                Action = "Imported",
                Count = parsedItems.Count,
                ProjectsCount = distinctProjects.Count
            });

            return Ok(new
            {
                success = true,
                count = parsedItems.Count,
                projectsCount = distinctProjects.Count,
                projectNames = distinctProjects,
                message = $"Berhasil mengimpor {parsedItems.Count} tugas ke dalam {distinctProjects.Count} proyek ({projectSummary})!",
                data = new
                {
                    importedCount = parsedItems.Count,
                    projectsCount = distinctProjects.Count,
                    projectNames = distinctProjects,
                    sampleTasks = parsedItems.Take(5).Select(t => new { t.Task.Id, t.Task.Title, t.Task.Status, t.Task.Priority, Project = t.ProjectName })
                }
            });
        }
    }
}
