using Dormitory.Web.Features.Buildings.DTOs;

namespace Dormitory.Web.Features.Buildings.Services
{
    public interface IToaNhaService
    {
        Task<List<BuildingItemDto>> GetAllBuildingsAsync();
        Task<BuildingItemDto?> GetBuildingByIdAsync(string id);
    }
}

