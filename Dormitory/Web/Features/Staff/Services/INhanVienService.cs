using Dormitory.Web.Features.Staff.DTOs;

namespace Dormitory.Web.Features.Staff.Services
{
    public interface INhanVienService
    {
        Task<List<StaffItemDto>> GetAllStaffAsync(string? deptKey = null, string? roleKey = null, string? status = null, string? search = null);
        Task<StaffItemDto> CreateStaffAsync(CreateStaffDto req);
        Task<bool> ToggleStaffStatusAsync(string staffId);
    }
}

