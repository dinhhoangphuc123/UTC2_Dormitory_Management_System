using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Buildings.DTOs;
using Dormitory.Web.Features.Buildings.Services;

namespace Dormitory.Web.Features.Buildings.Api
{
    [ApiController]
    [Route("api/toanha")]
    public class ToaNhaApiController : ControllerBase
    {
        private readonly IToaNhaService _toaNhaService;

        public ToaNhaApiController(IToaNhaService toaNhaService)
        {
            _toaNhaService = toaNhaService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var buildings = await _toaNhaService.GetAllBuildingsAsync();
            return Ok(ApiResponse<List<BuildingItemDto>>.Ok(buildings));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var building = await _toaNhaService.GetBuildingByIdAsync(id);
            if (building == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin tòa nhà."));
            }

            return Ok(ApiResponse<BuildingItemDto>.Ok(building));
        }
    }
}

