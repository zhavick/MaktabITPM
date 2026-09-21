using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Api.Models
{
    public class Timesheet
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        public int PeriodMonth { get; set; } // 1 - 12
        public int PeriodYear { get; set; }  // e.g. 2026

        [Required]
        [MaxLength(50)]
        public string SubmissionType { get; set; } = "InternalDaily"; // InternalDaily, ConsultantMonthlyUpload

        [MaxLength(255)]
        public string? UploadedFilePath { get; set; }

        [MaxLength(255)]
        public string? OriginalFileName { get; set; }

        [Column(TypeName = "decimal(8, 2)")]
        public decimal TotalHours { get; set; } = 0.00m;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Submitted, Approved, Rejected

        public int? ReviewerId { get; set; }
        public User? Reviewer { get; set; }

        public string? ReviewNotes { get; set; }

        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }

        public ICollection<TimesheetEntry> Entries { get; set; } = new List<TimesheetEntry>();
    }

    public class TimesheetEntry
    {
        [Key]
        public int Id { get; set; }

        public int TimesheetId { get; set; }
        public Timesheet? Timesheet { get; set; }

        public DateTime Date { get; set; }

        [Column(TypeName = "decimal(5, 2)")]
        public decimal Hours { get; set; }

        public int? TaskId { get; set; }
        public TaskItem? Task { get; set; }

        [Required]
        public string ActivityDescription { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
