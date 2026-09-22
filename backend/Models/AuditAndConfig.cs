using System;
using System.ComponentModel.DataAnnotations;

namespace ProjectManagement.Api.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public int? UserId { get; set; }
        public User? User { get; set; }

        [MaxLength(150)]
        public string UserName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string UserRole { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Module { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? IpAddress { get; set; }

        public string Details { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Severity { get; set; } = "Info"; // Info, Warning, Error, Security

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class SystemConfig
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Key { get; set; } = string.Empty;

        [Required]
        public string Value { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
