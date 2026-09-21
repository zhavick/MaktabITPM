using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Api.DTOs
{
    public class CreateTicketDto
    {
        [Required]
        public int ProjectId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Severity { get; set; } = "Medium"; // Low, Medium, High, Critical

        public string? AttachmentUrl { get; set; }
    }

    public class AssignTicketDto
    {
        public int? CaretakerUserId { get; set; } // Null if unassigning
    }

    public class UpdateTicketStatusDto
    {
        [Required]
        public string Status { get; set; } = "Open"; // Open, InProgress, InReview, Resolved, Closed

        public string? ResolutionNotes { get; set; }
    }

    public class AddTicketCommentDto
    {
        [Required]
        public string Comment { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }

        public string? StatusChange { get; set; }
    }

    public class TicketResponseDto
    {
        public int Id { get; set; }
        public string TicketNumber { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int ReportedByUserId { get; set; }
        public string ReportedByUserName { get; set; } = string.Empty;
        public string ReportedByUserRole { get; set; } = string.Empty;
        public int? AssignedCaretakerId { get; set; }
        public string? AssignedCaretakerName { get; set; }
        public string? AssignedCaretakerAvatar { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? ResolutionNotes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public List<TicketCommentDto> Comments { get; set; } = new();
    }

    public class TicketCommentDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public string Comment { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public string? StatusChange { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class DashboardStatsDto
    {
        public int TotalProjects { get; set; }
        public int TotalActiveTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OpenTickets { get; set; }
        public int TotalMembers { get; set; }
        public decimal TotalLoggedHoursThisMonth { get; set; }
        public decimal ConsultantHoursThisMonth { get; set; }
        public decimal InternalHoursThisMonth { get; set; }
        public int TodayAttendanceCount { get; set; }
    }
}
