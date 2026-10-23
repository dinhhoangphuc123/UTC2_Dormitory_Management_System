using Microsoft.AspNetCore.Mvc;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Services;
using Dormitory.Web.Features.Staff.Validators;

namespace Dormitory.Web.Features.Staff.Api
{
    [ApiController]
    [Route("api/nhanvien")]
    public class NhanVienApiController : ControllerBase
    {
        private readonly INhanVienService _nhanVienService;

        public NhanVienApiController(INhanVienService nhanVienService)
        {
            _nhanVienService = nhanVienService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? department,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            var staff = await _nhanVienService.GetAllStaffAsync(department, role, status, search);
            return Ok(ApiResponse<List<StaffItemDto>>.Ok(staff));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStaffDto req)
        {
            var (isValid, errorMessage) = CreateStaffValidator.Validate(req);
            if (!isValid)
            {
                return BadRequest(ApiResponse.Fail(errorMessage ?? "Thông tin không hợp lệ."));
            }

            var staff = await _nhanVienService.CreateStaffAsync(req);
            return Ok(ApiResponse<StaffItemDto>.Ok(staff, $"Đã thêm thành công nhân viên {staff.Name} ({staff.Code})!"));
        }

        [HttpPost("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(string id)
        {
            bool success = await _nhanVienService.ToggleStaffStatusAsync(id);
            if (success)
            {
                return Ok(ApiResponse.Ok("Đã thay đổi trạng thái hoạt động tài khoản thành công!"));
            }

            return BadRequest(ApiResponse.Fail("Không tìm thấy nhân viên tương ứng."));
        }
    }
}

