using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Models;

namespace ProjectManagement.Api.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<UserProfileDto?> GetProfileAsync(int userId);
        Task<UserProfileDto?> CompleteOnboardingAsync(int userId, OnboardingDto dto);
    }

    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthService(AppDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (existing != null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email sudah terdaftar dalam sistem."
                };
            }

            var role = dto.EmploymentType == "Consultant" ? "Consultant" : "InternalEmployee";

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = role,
                EmploymentType = dto.EmploymentType,
                CompanyOrAgency = dto.CompanyOrAgency,
                HourlyRate = dto.HourlyRate,
                Status = "PendingApproval", // Requires Admin Approval
                OnboardingCompleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new AuthResponseDto
            {
                Success = true,
                Message = "Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan (approval) dari Administrator.",
                User = MapToDto(user)
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower().Trim());
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email atau password tidak sesuai."
                };
            }

            if (user.Status == "PendingApproval")
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Akun Anda masih berstatus 'Pending Approval'. Silakan hubungi Administrator untuk persetujuan pendaftaran.",
                    User = MapToDto(user)
                };
            }

            if (user.Status == "Rejected")
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Permohonan pendaftaran akun Anda ditolak oleh Administrator."
                };
            }

            if (user.Status != "Active")
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Akun Anda dinonaktifkan."
                };
            }

            var token = _tokenService.GenerateToken(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Login berhasil!",
                Token = token,
                User = MapToDto(user)
            };
        }

        public async Task<UserProfileDto?> GetProfileAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user == null ? null : MapToDto(user);
        }

        public async Task<UserProfileDto?> CompleteOnboardingAsync(int userId, OnboardingDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return null;

            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrWhiteSpace(dto.AvatarUrl)) user.AvatarUrl = dto.AvatarUrl;
            if (!string.IsNullOrWhiteSpace(dto.CompanyOrAgency)) user.CompanyOrAgency = dto.CompanyOrAgency;
            if (dto.HourlyRate.HasValue) user.HourlyRate = dto.HourlyRate.Value;

            user.OnboardingCompleted = true;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToDto(user);
        }

        private static UserProfileDto MapToDto(User user)
        {
            return new UserProfileDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                EmploymentType = user.EmploymentType,
                Status = user.Status,
                CompanyOrAgency = user.CompanyOrAgency,
                HourlyRate = user.HourlyRate,
                AvatarUrl = user.AvatarUrl,
                OnboardingCompleted = user.OnboardingCompleted,
                CreatedAt = user.CreatedAt
            };
        }
    }
}
