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
                return BadRequest(ApiResponse.Fail("Không thể ghi nhận chỉ số: phòng không tồn tại, chỉ số mới nhỏ hơn chỉ số cũ, giá trị ngoài phạm vi hoặc kỳ ghi không hợp lệ."));
            }

            return Ok(ApiResponse<UtilityItemDto>.Ok(updated, $"Đã cập nhật chỉ số điện nước phòng {updated.Room} thành công!"));
        }

        [Authorize(Policy = RoleNames.AdminOrManagerPolicy)]
        [HttpPost("finalize")]
        public async Task<IActionResult> Finalize([FromBody] FinalizeUtilityDto req, [FromQuery] string? academicYear)
        {
            var (success, errorMessage, data) = await _dienNuocService.FinalizeUtilityBillsAsync(req, academicYear, _currentUser?.StaffId);
            if (!success || data == null)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Không thể chốt hóa đơn điện nước."));
            }

            string message = $"Đã chốt hóa đơn điện nước T{data.Thang:D2}/{data.Nam} phòng {data.Room}: " +
                $"{data.InvoicesCreated} hóa đơn sinh viên mới, {data.SoNguoiChia} người chia (điện {data.TienDienMoiNguoi:n0} đ + nước {data.TienNuocMoiNguoi:n0} đ/người" +
                (data.TienDichVu > 0 ? $", phí dịch vụ {data.TienDichVu:n0} đ" : "") + ").";
            return Ok(ApiResponse<FinalizeUtilityResultDto>.Ok(data, message));
        }
    }
}
