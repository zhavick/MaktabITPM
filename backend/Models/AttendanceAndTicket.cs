using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Api.Models
{
    public class Attendance
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public DateTime Date { get; set; }

        public DateTime ClockInTime { get; set; }

        public DateTime? ClockOutTime { get; set; }

        [Required]
        [MaxLength(50)]
        public string WorkMode { get; set; } = "WFO"; // WFO, WFH

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Present"; // Present, Late, Sick, Leave, Alpha

        [MaxLength(200)]
        public string? LocationNotes { get; set; }

        public string? Notes { get; set; }
    }

    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string TicketNumber { get; set; } = string.Empty; // e.g. TCK-2026-0001

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Severity { get; set; } = "Medium"; // Low, Medium, High, Critical

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Open"; // Open, InProgress, InReview, Resolved, Closed

        public int ReportedByUserId { get; set; }
        public User? ReportedByUser { get; set; }

        public int? AssignedCaretakerId { get; set; }
        public User? AssignedCaretaker { get; set; }

        [MaxLength(255)]
        public string? AttachmentUrl { get; set; }

        public string? ResolutionNotes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ResolvedAt { get; set; }

        public ICollection<TicketComment> Comments { get; set; } = new List<TicketComment>();
    }

    public class TicketComment
    {
        [Key]
        public int Id { get; set; }

        public int TicketId { get; set; }
        public Ticket? Ticket { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        public string Comment { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? AttachmentUrl { get; set; }

        [MaxLength(50)]
        public string? StatusChange { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
