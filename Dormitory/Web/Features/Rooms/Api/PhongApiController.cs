using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Services;
using Dormitory.Web.Shared.Constants;

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

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? buildingId,
            [FromQuery] int? floor,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var rooms = await _phongService.GetAllRoomsAsync(buildingId, floor, status, search, academicYear);
            return Ok(ApiResponse<List<RoomListItemDto>>.Ok(rooms));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("beds/{bedId}/toggle-maintenance")]
        public async Task<IActionResult> ToggleMaintenance(string bedId, [FromQuery] string? academicYear)
        {
            bool success = await _phongService.ToggleBedMaintenanceAsync(bedId, academicYear);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã thay đổi trạng thái bảo trì của giường!"));
            }

            return BadRequest(ApiResponse.Fail("Không tìm thấy giường hoặc thao tác thất bại."));
        }
    }
}
