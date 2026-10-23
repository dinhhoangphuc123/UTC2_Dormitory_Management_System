using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Services;

namespace Dormitory.Web.Features.Rooms.Api
{
    [ApiController]
    [Route("api/phong")]
    public class PhongApiController : ControllerBase
    {
        private readonly IPhongService _phongService;

        public PhongApiController(IPhongService phongService)
        {
            _phongService = phongService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? buildingId,
            [FromQuery] int? floor,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var rooms = await _phongService.GetAllRoomsAsync(buildingId, floor, status, search);
            return Ok(ApiResponse<List<RoomListItemDto>>.Ok(rooms));
        }

        [HttpPost("beds/{bedId}/toggle-maintenance")]
        public async Task<IActionResult> ToggleMaintenance(string bedId)
        {
            bool success = await _phongService.ToggleBedMaintenanceAsync(bedId);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã thay đổi trạng thái bảo trì của giường!"));
            }

            return BadRequest(ApiResponse.Fail("Không tìm thấy giường hoặc thao tác thất bại."));
        }
    }
}

