using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.DTOs
{
    public class UpdateProfileDto
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
        public string? Bio { get; set; }
        public string? Location { get; set; }
        public string? CompanyOrAgency { get; set; }
        public decimal HourlyRate { get; set; } = 0.00m;
    }

    public class ChangePasswordDto
    {
        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class UserFullProfileDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? CompanyOrAgency { get; set; }
        public decimal HourlyRate { get; set; }
        public string? AvatarUrl { get; set; }
        public string? CoverUrl { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Bio { get; set; }
        public string? Location { get; set; }
        public bool OnboardingCompleted { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SystemConfigDto
    {
        public string BaseUrl { get; set; } = "http://localhost:5173";
        public string AppTitle { get; set; } = "Enterprise Project Management";
        public bool AllowRegistration { get; set; } = true;
    }

    public class DatabaseHealthDto
    {
        public string Status { get; set; } = "Healthy";
        public string Engine { get; set; } = "MySQL 8.0 / SQLite";
        public string DatabaseName { get; set; } = "project_management_db";
        public string DatabaseSize { get; set; } = "1.85 MB";
        public int TotalUsers { get; set; }
        public Dictionary<string, int> UsersByRole { get; set; } = new();
        public Dictionary<string, int> UsersByStatus { get; set; } = new();
        public Dictionary<string, int> TableCounts { get; set; } = new();
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    }

    public class DatabaseSnapshotDto
    {
        public string Version { get; set; } = "1.0.0";
        public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
        public List<User> Users { get; set; } = new();
        public List<Project> Projects { get; set; } = new();
        public List<ProjectMember> ProjectMembers { get; set; } = new();
        public List<TaskItem> Tasks { get; set; } = new();
        public List<Note> Notes { get; set; } = new();
        public List<Timesheet> Timesheets { get; set; } = new();
        public List<TimesheetEntry> TimesheetEntries { get; set; } = new();
        public List<Attendance> Attendances { get; set; } = new();
        public List<Ticket> Tickets { get; set; } = new();
        public List<TicketComment> TicketComments { get; set; } = new();
        public List<AuditLog> AuditLogs { get; set; } = new();
        public List<SystemConfig> SystemConfigs { get; set; } = new();
    }
}
