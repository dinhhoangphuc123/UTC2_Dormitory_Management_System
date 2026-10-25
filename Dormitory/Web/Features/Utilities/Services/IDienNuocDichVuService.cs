using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Services
{
    public interface IDienNuocDichVuService
    {
        Task<List<UtilityItemDto>> GetAllUtilitiesAsync(string? building = null, int? floor = null, string? status = null, string? search = null, string? academicYear = null);
        Task<UtilityItemDto?> RecordUtilityAsync(RecordUtilityDto req, string? academicYear = null);
    }
}

