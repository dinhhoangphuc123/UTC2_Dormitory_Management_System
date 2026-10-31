using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Features.Utilities.Validators;
using Dormitory.Web.Shared.Constants;
using Dormitory.Web.Shared.Security;

namespace Dormitory.Web.Features.Utilities.Api
{
    [ApiController]
    [Route("api/diennuoc")]
    public class DienNuocApiController : ControllerBase
    {
        private readonly IDienNuocDichVuService _dienNuocService;
        private readonly ICurrentUser? _currentUser;

        public DienNuocApiController(IDienNuocDichVuService dienNuocService, ICurrentUser? currentUser = null)
        {
            _dienNuocService = dienNuocService;
            _currentUser = currentUser;
        }

        [Authorize(Policy = RoleNames.StaffOnlyPolicy)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] int? floor,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? academicYear)
        {
            var utilities = await _dienNuocService.GetAllUtilitiesAsync(building, floor, status, search, academicYear);
            return Ok(ApiResponse<List<UtilityItemDto>>.Ok(utilities));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("record")]
        public async Task<IActionResult> Record([FromBody] RecordUtilityDto req, [FromQuery] string? academicYear)
        {
            var (isValid, errorMessage) = RecordUtilityValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var updated = await _dienNuocService.RecordUtilityAsync(req, academicYear, _currentUser?.StaffId);
            if (updated == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin phòng tương ứng!"));
            }

            return Ok(ApiResponse<UtilityItemDto>.Ok(updated, $"Đã cập nhật chỉ số điện nước phòng {updated.Room} thành công!"));
        }
    }
}
