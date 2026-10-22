using Microsoft.AspNetCore.Mvc;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Controllers.Api
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
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Phone) || string.IsNullOrWhiteSpace(req.Email))
            {
                return BadRequest(ApiResponse.Fail("Vui lòng điền đầy đủ họ tên, SĐT và email cán bộ!"));
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

