using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Services;
using Dormitory.Web.Features.Utilities.Validators;

namespace Dormitory.Web.Features.Utilities.Api
{
    [ApiController]
    [Route("api/diennuoc")]
    public class DienNuocApiController : ControllerBase
    {
        private readonly IDienNuocDichVuService _dienNuocService;

        public DienNuocApiController(IDienNuocDichVuService dienNuocService)
        {
            _dienNuocService = dienNuocService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? building,
            [FromQuery] int? floor,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var utilities = await _dienNuocService.GetAllUtilitiesAsync(building, floor, status, search);
            return Ok(ApiResponse<List<UtilityItemDto>>.Ok(utilities));
        }

        [HttpPost("record")]
        public async Task<IActionResult> Record([FromBody] RecordUtilityDto req)
        {
            var (isValid, errorMessage) = RecordUtilityValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var updated = await _dienNuocService.RecordUtilityAsync(req);
            if (updated == null)
            {
                return NotFound(ApiResponse.Fail("Không tìm thấy thông tin phòng tương ứng!"));
            }

            return Ok(ApiResponse<UtilityItemDto>.Ok(updated, $"Đã cập nhật chỉ số điện nước phòng {updated.Room} thành công!"));
        }
    }
}

