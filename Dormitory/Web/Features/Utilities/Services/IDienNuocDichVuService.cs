using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Services
{
    public interface IDienNuocDichVuService
    {
        Task<List<UtilityItemDto>> GetAllUtilitiesAsync(string? building = null, int? floor = null, string? status = null, string? search = null);
        Task<UtilityItemDto?> RecordUtilityAsync(RecordUtilityDto req);
    }
}

