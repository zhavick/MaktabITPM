using System;
using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Api.DTOs
{
    public class RegisterDto
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string EmploymentType { get; set; } = "Internal"; // Internal, Consultant

        public string? CompanyOrAgency { get; set; }

        public decimal HourlyRate { get; set; } = 0.00m;
    }

    public class LoginDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Token { get; set; }
        public UserProfileDto? User { get; set; }
    }

    public class UserProfileDto
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
        public bool OnboardingCompleted { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OnboardingDto
    {
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public string? CompanyOrAgency { get; set; }
        public decimal? HourlyRate { get; set; }
    }

    public class MemberInviteDto
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "InternalEmployee"; // Admin, ProjectManager, Caretaker, InternalEmployee, Consultant

        [Required]
        public string EmploymentType { get; set; } = "Internal";

        public string? CompanyOrAgency { get; set; }
        public decimal HourlyRate { get; set; } = 0.00m;

        public int? ProjectId { get; set; }
    }

    public class MemberApprovalDto
    {
        [Required]
        public string Action { get; set; } = "Approve"; // Approve, Reject

        public string? AssignedRole { get; set; } // Admin, ProjectManager, Caretaker, InternalEmployee, Consultant

        public string? Reason { get; set; }
    }
}
