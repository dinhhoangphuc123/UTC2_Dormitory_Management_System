using Dormitory.Web.Features.Rooms.DTOs;

namespace Dormitory.Web.Features.Rooms.Services
{
    public interface IPhongService
    {
        Task<List<RoomListItemDto>> GetAllRoomsAsync(
            string? buildingId = null,
            int? floor = null,
            string? status = null,
            string? search = null);

        Task<bool> ToggleBedMaintenanceAsync(string bedId);
    }
}

