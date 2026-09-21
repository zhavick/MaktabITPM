using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Api.Models
{
    public class TaskItem
    {
        [Key]
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Todo"; // Todo, InProgress, InReview, Done

        [Required]
        [MaxLength(50)]
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent

        public int? AssigneeId { get; set; }
        public User? Assignee { get; set; }

        public DateTime? DueDate { get; set; }

        [Column(TypeName = "decimal(6, 2)")]
        public decimal EstimatedHours { get; set; } = 0.00m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Note
    {
        [Key]
        public int Id { get; set; }

        public int? ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = "General"; // Meeting, Architecture, Guide, General

        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
