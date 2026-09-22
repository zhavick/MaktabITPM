using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ProjectManagement.Api.DTOs
{
    public class CreateProjectDto
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string ClientName { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public decimal Budget { get; set; } = 0.00m;
        public string? ProjectType { get; set; } = "New Application";
        public string? Color { get; set; } = "#4f46e5";
        public List<int>? MemberUserIds { get; set; }
    }

    public class ProjectResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = "Active";
        public string ProjectType { get; set; } = "New Application";
        public string Color { get; set; } = "#4f46e5";
        public decimal Budget { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ProjectMemberDto> Members { get; set; } = new();
    }

    public class ProjectMemberDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string RoleInProject { get; set; } = string.Empty;
    }

    public class CreateTaskDto
    {
        [Required]
        public int ProjectId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Todo"; // Todo, InProgress, InReview, Done
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent
        public string? Category { get; set; }
        public string? Milestone { get; set; }
        public int? AssigneeId { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal EstimatedHours { get; set; } = 0.00m;
    }

    public class UpdateTaskStatusDto
    {
        [Required]
        public string Status { get; set; } = "Todo"; // Todo, InProgress, InReview, Done
    }

    public class TaskExcelImportDto
    {
        public int? ProjectId { get; set; }

        [Required]
        public IFormFile File { get; set; } = null!;
    }

    public class TaskResponseDto
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectCode { get; set; } = string.Empty;
        public string ProjectColor { get; set; } = "#4f46e5";
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Milestone { get; set; }
        public int? AssigneeId { get; set; }
        public string? AssigneeName { get; set; }
        public string? AssigneeAvatar { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal EstimatedHours { get; set; }
        public int CommentCount { get; set; }
        public DateTime CreatedAt { get; set; }

        public bool IsPendingDeletion { get; set; }
        public int? DeletionRequestedById { get; set; }
        public string? DeletionRequestedByName { get; set; }
        public string? DeletionReason { get; set; }
        public DateTime? DeletionRequestedAt { get; set; }
        public bool CanApproveDeletion { get; set; }
    }

    public class RequestTaskDeletionDto
    {
        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    public class RejectTaskDeletionDto
    {
        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    public class CreateTaskCommentDto
    {
        [Required]
        public string Comment { get; set; } = string.Empty;
    }

    public class TaskCommentDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsOwner { get; set; }
    }

    public class TaskActivityDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserAvatar { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateNoteDto
    {
        public int? ProjectId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = "General"; // Meeting, Architecture, Guide, General
    }

    public class NoteResponseDto
    {
        public int Id { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int CreatedByUserId { get; set; }
        public string CreatedByUserName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
