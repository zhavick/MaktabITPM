using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Services
{
    public interface IAuditService
    {
        Task LogAsync(string action, string module, string details, string severity = "Info", int? userId = null, string? userName = null, string? userRole = null, string? ipAddress = null);
    }

    public class AuditService : IAuditService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuditService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogAsync(
            string action, 
            string module, 
            string details, 
            string severity = "Info", 
            int? userId = null, 
            string? userName = null, 
            string? userRole = null, 
            string? ipAddress = null)
        {
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                var ip = ipAddress ?? httpContext?.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                var audit = new AuditLog
                {
                    UserId = userId,
                    UserName = userName ?? "System",
                    UserRole = userRole ?? "System",
                    Action = action,
                    Module = module,
                    Details = details,
                    Severity = severity,
                    IpAddress = ip,
                    Timestamp = DateTime.UtcNow
                };

                _context.AuditLogs.Add(audit);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Audit Logging Error]: {ex.Message}");
            }
        }
    }
}
