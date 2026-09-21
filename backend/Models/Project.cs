using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Api.Models
{
    public class Project
    {
        [Key]
        public int Id { get; set; }

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

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // Active, OnHold, Completed

        [Column(TypeName = "decimal(15, 2)")]
        public decimal Budget { get; set; } = 0.00m;

        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
        public ICollection<Note> Notes { get; set; } = new List<Note>();
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }

    public class ProjectMember
    {
        [Key]
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        [MaxLength(50)]
        public string RoleInProject { get; set; } = "Member"; // Manager, Developer, Consultant, CaretakerLead, CaretakerMember

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
