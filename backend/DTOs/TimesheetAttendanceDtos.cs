using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ProjectManagement.Api.DTOs
{
    public class InternalTimesheetLogDto
    {
        [Required]
        public int ProjectId { get; set; }

        public int? TaskId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [Range(0.1, 24.0)]
        public decimal Hours { get; set; }

        [Required]
        public string ActivityDescription { get; set; } = string.Empty;
    }

    public class ConsultantUploadDto
    {
        [Required]
        public int ProjectId { get; set; }

        [Required]
        [Range(1, 12)]
        public int PeriodMonth { get; set; }

        [Required]
        [Range(2020, 2035)]
        public int PeriodYear { get; set; }

        [Required]
        public IFormFile File { get; set; } = null!;
    }

    public class TimesheetReviewDto
    {
        [Required]
        public string Action { get; set; } = "Approve"; // Approve, Reject

        public string? ReviewNotes { get; set; }
    }

    public class TimesheetResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public string? CompanyOrAgency { get; set; }
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int PeriodMonth { get; set; }
        public int PeriodYear { get; set; }
        public string SubmissionType { get; set; } = string.Empty;
        public string? UploadedFilePath { get; set; }
        public string? OriginalFileName { get; set; }
        public decimal TotalHours { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReviewNotes { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public List<TimesheetEntryDto> Entries { get; set; } = new();
    }

    public class TimesheetEntryDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
        public int? TaskId { get; set; }
        public string? TaskTitle { get; set; }
        public string ActivityDescription { get; set; } = string.Empty;
    }

    public class ClockInDto
    {
        [Required]
        public string WorkMode { get; set; } = "WFO"; // WFO, WFH

        public string? LocationNotes { get; set; }
        public string? Notes { get; set; }
    }

    public class AttendanceResponseDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime ClockInTime { get; set; }
        public DateTime? ClockOutTime { get; set; }
        public string WorkMode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? LocationNotes { get; set; }
        public string? Notes { get; set; }
        public double? TotalWorkingHours { get; set; }
    }
}
