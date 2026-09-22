using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectManagement.Api.Data;
using ProjectManagement.Api.DTOs;
using ProjectManagement.Api.Hubs;
using ProjectManagement.Api.Models;
using ProjectManagement.Api.Services;

namespace ProjectManagement.Api.Controllers
{
    [ApiController]
    [Route("api/master-data")]
    [Authorize]
    public class MasterDataController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly IHubContext<SyncHub> _hubContext;

        public MasterDataController(AppDbContext context, IAuditService auditService, IHubContext<SyncHub> hubContext)
        {
            _context = context;
            _auditService = auditService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] bool? activeOnly)
        {
            var query = _context.MasterDataItems.AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(m => m.Type.ToLower() == type.ToLower());

            if (activeOnly.HasValue && activeOnly.Value)
                query = query.Where(m => m.IsActive);

            var items = await query
                .OrderBy(m => m.Type)
                .ThenBy(m => m.SortOrder)
                .ThenBy(m => m.Name)
                .Select(m => new MasterDataResponseDto
                {
                    Id = m.Id,
                    Type = m.Type,
                    Code = m.Code,
                    Name = m.Name,
                    Description = m.Description,
                    BadgeColor = m.BadgeColor,
                    SortOrder = m.SortOrder,
                    IsActive = m.IsActive,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = items });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.MasterDataItems.FindAsync(id);
            if (item == null)
                return NotFound(new { success = false, message = "Item master data tidak ditemukan." });

            return Ok(new
            {
                success = true,
                data = new MasterDataResponseDto
                {
                    Id = item.Id,
                    Type = item.Type,
                    Code = item.Code,
                    Name = item.Name,
                    Description = item.Description,
                    BadgeColor = item.BadgeColor,
                    SortOrder = item.SortOrder,
                    IsActive = item.IsActive,
                    CreatedAt = item.CreatedAt
                }
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Create([FromBody] CreateMasterDataDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var exists = await _context.MasterDataItems.AnyAsync(m => 
                m.Type.ToLower() == dto.Type.ToLower() && m.Code.ToLower() == dto.Code.ToLower());

            if (exists)
                return BadRequest(new { success = false, message = $"Kode '{dto.Code}' sudah digunakan untuk tipe master '{dto.Type}'." });

            var item = new MasterDataItem
            {
                Type = dto.Type,
                Code = dto.Code.Trim().ToUpper(),
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                BadgeColor = !string.IsNullOrWhiteSpace(dto.BadgeColor) ? dto.BadgeColor.Trim() : "#6366f1",
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.MasterDataItems.Add(item);
            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
            await _auditService.LogAsync("MASTER_DATA_CREATED", "MasterData", 
                $"Master {item.Type} baru '{item.Name}' ({item.Code}) ditambahkan.", 
                "Info", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "MasterDataUpdated",
                MasterType = item.Type,
                Action = "Created"
            });

            return Ok(new { success = true, message = $"Master {item.Type} berhasil ditambahkan!", data = item });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateMasterDataDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var item = await _context.MasterDataItems.FindAsync(id);
            if (item == null)
                return NotFound(new { success = false, message = "Item master data tidak ditemukan." });

            item.Code = dto.Code.Trim().ToUpper();
            item.Name = dto.Name.Trim();
            item.Description = dto.Description?.Trim();
            item.BadgeColor = !string.IsNullOrWhiteSpace(dto.BadgeColor) ? dto.BadgeColor.Trim() : "#6366f1";
            item.SortOrder = dto.SortOrder;
            item.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
            await _auditService.LogAsync("MASTER_DATA_UPDATED", "MasterData", 
                $"Master {item.Type} '{item.Name}' diperbarui.", 
                "Info", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "MasterDataUpdated",
                MasterType = item.Type,
                Action = "Updated"
            });

            return Ok(new { success = true, message = $"Master {item.Type} berhasil diperbarui!", data = item });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,ProjectManager")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.MasterDataItems.FindAsync(id);
            if (item == null)
                return NotFound(new { success = false, message = "Item master data tidak ditemukan." });

            _context.MasterDataItems.Remove(item);
            await _context.SaveChangesAsync();

            var currentUserName = User.FindFirstValue(ClaimTypes.Name);
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
            await _auditService.LogAsync("MASTER_DATA_DELETED", "MasterData", 
                $"Master {item.Type} '{item.Name}' ({item.Code}) dihapus.", 
                "Warning", null, currentUserName, currentUserRole);

            await _hubContext.Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = "MasterDataUpdated",
                MasterType = item.Type,
                Action = "Deleted"
            });

            return Ok(new { success = true, message = $"Master {item.Type} berhasil dihapus!" });
        }
    }
}
