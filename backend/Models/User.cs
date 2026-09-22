using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagement.Api.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = "InternalEmployee"; // Admin, ProjectManager, Caretaker, InternalEmployee, Consultant

        [Required]
        [MaxLength(50)]
        public string EmploymentType { get; set; } = "Internal"; // Internal, Consultant

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "PendingApproval"; // PendingApproval, Active, Inactive, Rejected

        [MaxLength(150)]
        public string? CompanyOrAgency { get; set; }

        [Column(TypeName = "decimal(12, 2)")]
        public decimal HourlyRate { get; set; } = 0.00m;

        [MaxLength(255)]
        public string? AvatarUrl { get; set; }

        [MaxLength(255)]
        public string? CoverUrl { get; set; }

        [MaxLength(50)]
        public string? PhoneNumber { get; set; }

        public string? Bio { get; set; }

        [MaxLength(150)]
        public string? Location { get; set; }

        public bool OnboardingCompleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
